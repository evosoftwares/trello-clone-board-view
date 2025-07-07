-- Create user points system tables
-- This migration adds tables to track function points awarded to users when tasks are completed

-- 1. Create user_points table to track accumulated points per user
CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Will add foreign key constraint after checking if profiles table exists
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create user_point_awards table to log individual point awards
CREATE TABLE user_point_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Will add foreign key constraint after checking if profiles table exists
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_title TEXT NOT NULL,
  task_complexity TEXT NOT NULL,
  from_column_id UUID REFERENCES kanban_columns(id) ON DELETE SET NULL,
  to_column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  -- Prevent duplicate awards for the same task
  UNIQUE(task_id, user_id)
);

-- 3. Enable Row Level Security
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_awards ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive policies for development
CREATE POLICY "Allow all operations on user_points" ON user_points FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_point_awards" ON user_point_awards FOR ALL USING (true);

-- 5. Add update trigger for user_points table
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE user_point_awards;

-- 7. Set replica identity for realtime updates
ALTER TABLE user_points REPLICA IDENTITY FULL;
ALTER TABLE user_point_awards REPLICA IDENTITY FULL;

-- 8. Create function to award points to user when task is completed
CREATE OR REPLACE FUNCTION award_points_for_completed_task(
    p_task_id UUID,
    p_user_id UUID,
    p_points INTEGER,
    p_task_title TEXT,
    p_task_complexity TEXT,
    p_from_column_id UUID,
    p_to_column_id UUID,
    p_project_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insert the point award record (will fail silently if duplicate due to UNIQUE constraint)
    INSERT INTO user_point_awards (
        user_id,
        task_id,
        points_awarded,
        task_title,
        task_complexity,
        from_column_id,
        to_column_id,
        project_id
    ) VALUES (
        p_user_id,
        p_task_id,
        p_points,
        p_task_title,
        p_task_complexity,
        p_from_column_id,
        p_to_column_id,
        p_project_id
    ) ON CONFLICT (task_id, user_id) DO NOTHING;
    
    -- Update or insert user total points (upsert pattern)
    INSERT INTO user_points (user_id, total_points)
    VALUES (p_user_id, p_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_points = user_points.total_points + EXCLUDED.total_points,
        updated_at = NOW();
        
    RAISE NOTICE 'Awarded % points to user % for completing task %', p_points, p_user_id, p_task_title;
END;
$$ LANGUAGE plpgsql;

-- 9. Create enhanced task update function that awards points for completed tasks
CREATE OR REPLACE FUNCTION update_task_with_time_tracking_and_points(
    p_task_id UUID,
    p_updates JSONB,
    p_column_changed BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    update_record JSONB;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
    task_record RECORD;
    old_column_name TEXT;
    new_column_name TEXT;
    is_completion BOOLEAN := FALSE;
BEGIN
    -- Log para debugging
    RAISE NOTICE 'Updating task positions with points system. Task ID: %, Column changed: %', p_task_id, p_column_changed;
    RAISE NOTICE 'Updates to apply: %', p_updates;
    
    -- If column changed, check if it's a completion (moving to a completed column)
    IF p_column_changed THEN
        -- Get task details
        SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
        
        -- Get old column name
        SELECT title INTO old_column_name FROM kanban_columns WHERE id = task_record.column_id;
        
        -- Find the new column from updates
        FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
        LOOP
            IF (update_record->>'id')::uuid = p_task_id THEN
                SELECT title INTO new_column_name 
                FROM kanban_columns 
                WHERE id = (update_record->>'column_id')::uuid;
                
                -- Check if destination is a completed column
                is_completion := (
                    LOWER(new_column_name) LIKE '%concluído%' OR 
                    LOWER(new_column_name) LIKE '%concluido%' OR
                    LOWER(new_column_name) LIKE '%completed%' OR 
                    LOWER(new_column_name) LIKE '%done%' OR
                    LOWER(new_column_name) LIKE '%sucesso%' OR
                    LOWER(new_column_name) LIKE '%success%'
                );
                
                RAISE NOTICE 'Task % moving from "%" to "%" - Is completion: %', 
                    task_record.title, old_column_name, new_column_name, is_completion;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    -- Atualizar todas as tarefas atomicamente em uma única transação
    FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        RAISE NOTICE 'Updating task % to column % position %', 
            (update_record->>'id')::uuid, 
            (update_record->>'column_id')::uuid, 
            (update_record->>'position')::integer;
            
        -- Se é a tarefa sendo movida e houve mudança de coluna, atualizar timestamp
        IF (update_record->>'id')::uuid = p_task_id AND p_column_changed THEN
            UPDATE tasks 
            SET 
                column_id = (update_record->>'column_id')::uuid,
                position = (update_record->>'position')::integer,
                current_status_start_time = current_timestamp
            WHERE id = (update_record->>'id')::uuid;
        ELSE
            -- Atualização normal de posição
            UPDATE tasks 
            SET 
                column_id = (update_record->>'column_id')::uuid,
                position = (update_record->>'position')::integer
            WHERE id = (update_record->>'id')::uuid;
        END IF;
    END LOOP;
    
    -- Award points if this is a completion and task has an assignee
    IF is_completion AND task_record.assignee IS NOT NULL AND task_record.function_points > 0 THEN
        PERFORM award_points_for_completed_task(
            p_task_id,
            task_record.assignee::uuid,
            task_record.function_points,
            task_record.title,
            task_record.complexity,
            task_record.column_id, -- from column
            (SELECT (update_record->>'column_id')::uuid 
             FROM jsonb_array_elements(p_updates) AS update_record 
             WHERE (update_record->>'id')::uuid = p_task_id 
             LIMIT 1), -- to column
            task_record.project_id::uuid
        );
    END IF;
    
    RAISE NOTICE 'Task positioning and points update completed successfully';
END;
$$ LANGUAGE plpgsql;

-- 10. Create view for easy querying of user points with names
-- Note: This view will work with either profiles or team_members table
CREATE OR REPLACE VIEW user_points_with_names AS
SELECT 
    up.id,
    up.user_id,
    COALESCE(p.name, tm.name) as user_name,
    COALESCE(p.email, tm.email) as email,
    COALESCE(p.avatar, tm.avatar) as avatar,
    up.total_points,
    up.created_at,
    up.updated_at,
    COALESCE(awards_count.count, 0) as total_awards
FROM user_points up
LEFT JOIN profiles p ON up.user_id = p.id
LEFT JOIN team_members tm ON up.user_id = tm.id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM user_point_awards 
    GROUP BY user_id
) awards_count ON up.user_id = awards_count.user_id;

-- 11. Create view for detailed point awards history
CREATE OR REPLACE VIEW user_point_awards_detailed AS
SELECT 
    upa.id,
    upa.user_id,
    COALESCE(p.name, tm.name) as user_name,
    upa.task_id,
    upa.task_title,
    upa.points_awarded,
    upa.task_complexity,
    upa.awarded_at,
    from_col.title as from_column_name,
    to_col.title as to_column_name,
    proj.name as project_name,
    proj.color as project_color
FROM user_point_awards upa
LEFT JOIN profiles p ON upa.user_id = p.id
LEFT JOIN team_members tm ON upa.user_id = tm.id
LEFT JOIN kanban_columns from_col ON upa.from_column_id = from_col.id
LEFT JOIN kanban_columns to_col ON upa.to_column_id = to_col.id
LEFT JOIN projects proj ON upa.project_id = proj.id
ORDER BY upa.awarded_at DESC;

-- 12. Add foreign key constraints if profiles table exists
DO $$
BEGIN
    -- Check if profiles table exists and add foreign key constraints
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Add foreign key constraints
        ALTER TABLE user_points ADD CONSTRAINT fk_user_points_profiles 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        ALTER TABLE user_point_awards ADD CONSTRAINT fk_user_point_awards_profiles 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Initialize user_points for existing users (backfill)
        INSERT INTO user_points (user_id, total_points)
        SELECT id, 0 FROM profiles
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Foreign key constraints added and user points initialized';
    ELSE
        -- If using team_members table instead
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_members') THEN
            ALTER TABLE user_points ADD CONSTRAINT fk_user_points_team_members 
                FOREIGN KEY (user_id) REFERENCES team_members(id) ON DELETE CASCADE;
            ALTER TABLE user_point_awards ADD CONSTRAINT fk_user_point_awards_team_members 
                FOREIGN KEY (user_id) REFERENCES team_members(id) ON DELETE CASCADE;
            
            -- Initialize user_points for existing team members (backfill)
            INSERT INTO user_points (user_id, total_points)
            SELECT id, 0 FROM team_members
            ON CONFLICT (user_id) DO NOTHING;
            
            RAISE NOTICE 'Foreign key constraints added to team_members and user points initialized';
        ELSE
            RAISE NOTICE 'Neither profiles nor team_members table found - foreign key constraints not added';
        END IF;
    END IF;
END $$;

-- 13. Update existing trigger function to work with both profiles and team_members
CREATE OR REPLACE FUNCTION log_task_time_change()
RETURNS TRIGGER AS $$
DECLARE
    duration_calc INTEGER;
    old_column_name TEXT;
    old_user_name TEXT;
BEGIN
    -- Só processa se não é INSERT (criação inicial) e se current_status_start_time existe
    IF TG_OP = 'UPDATE' AND OLD.current_status_start_time IS NOT NULL THEN
        
        -- Verifica se houve mudança de coluna ou responsável
        IF (OLD.column_id IS DISTINCT FROM NEW.column_id) OR 
           (OLD.assignee IS DISTINCT FROM NEW.assignee) THEN
            
            -- Calcula duração em segundos usando o timestamp OLD (mais preciso)
            duration_calc := EXTRACT(EPOCH FROM (NEW.current_status_start_time - OLD.current_status_start_time))::INTEGER;
            
            -- Busca nome da coluna anterior
            SELECT title INTO old_column_name 
            FROM kanban_columns 
            WHERE id = OLD.column_id;
            
            -- Busca nome do responsável anterior (try profiles first, then team_members)
            IF OLD.assignee IS NOT NULL THEN
                SELECT name INTO old_user_name 
                FROM profiles 
                WHERE id = OLD.assignee;
                
                -- If not found in profiles, try team_members
                IF old_user_name IS NULL THEN
                    SELECT name INTO old_user_name 
                    FROM team_members 
                    WHERE id = OLD.assignee;
                END IF;
            END IF;
            
            -- Insere registro no histórico apenas se a duração for positiva (evita logs espúrios)
            IF duration_calc > 0 THEN
                INSERT INTO task_time_log (
                    task_id,
                    column_id,
                    column_name,
                    user_id,
                    user_name,
                    start_time,
                    end_time,
                    duration_seconds
                ) VALUES (
                    NEW.id,
                    OLD.column_id,
                    COALESCE(old_column_name, 'Coluna Desconhecida'),
                    OLD.assignee,
                    old_user_name,
                    OLD.current_status_start_time,
                    NEW.current_status_start_time,
                    duration_calc
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE 'User points system migration completed successfully';