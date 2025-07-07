-- User Points System Migration
-- Execute este arquivo no Supabase Dashboard SQL Editor

-- 1. Create user_points table
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create user_point_awards table
CREATE TABLE IF NOT EXISTS user_point_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_title TEXT NOT NULL,
  task_complexity TEXT NOT NULL,
  from_column_id UUID REFERENCES kanban_columns(id) ON DELETE SET NULL,
  to_column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
);

-- 3. Enable Row Level Security
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_awards ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Allow all operations on user_points" ON user_points FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_point_awards" ON user_point_awards FOR ALL USING (true);

-- 5. Add update trigger for user_points
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE user_point_awards;

-- 7. Set replica identity
ALTER TABLE user_points REPLICA IDENTITY FULL;
ALTER TABLE user_point_awards REPLICA IDENTITY FULL;

-- 8. Create function to award points
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
    
    INSERT INTO user_points (user_id, total_points)
    VALUES (p_user_id, p_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_points = user_points.total_points + EXCLUDED.total_points,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Create enhanced task update function
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
    IF p_column_changed THEN
        SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
        SELECT title INTO old_column_name FROM kanban_columns WHERE id = task_record.column_id;
        
        FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
        LOOP
            IF (update_record->>'id')::uuid = p_task_id THEN
                SELECT title INTO new_column_name 
                FROM kanban_columns 
                WHERE id = (update_record->>'column_id')::uuid;
                
                is_completion := (
                    LOWER(new_column_name) LIKE '%concluído%' OR 
                    LOWER(new_column_name) LIKE '%concluido%' OR
                    LOWER(new_column_name) LIKE '%completed%' OR 
                    LOWER(new_column_name) LIKE '%done%' OR
                    LOWER(new_column_name) LIKE '%sucesso%' OR
                    LOWER(new_column_name) LIKE '%success%'
                );
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        IF (update_record->>'id')::uuid = p_task_id AND p_column_changed THEN
            UPDATE tasks 
            SET 
                column_id = (update_record->>'column_id')::uuid,
                position = (update_record->>'position')::integer,
                current_status_start_time = current_timestamp
            WHERE id = (update_record->>'id')::uuid;
        ELSE
            UPDATE tasks 
            SET 
                column_id = (update_record->>'column_id')::uuid,
                position = (update_record->>'position')::integer
            WHERE id = (update_record->>'id')::uuid;
        END IF;
    END LOOP;
    
    IF is_completion AND task_record.assignee IS NOT NULL AND task_record.function_points > 0 THEN
        PERFORM award_points_for_completed_task(
            p_task_id,
            task_record.assignee::uuid,
            task_record.function_points,
            task_record.title,
            task_record.complexity,
            task_record.column_id,
            (SELECT (update_record->>'column_id')::uuid 
             FROM jsonb_array_elements(p_updates) AS update_record 
             WHERE (update_record->>'id')::uuid = p_task_id 
             LIMIT 1),
            task_record.project_id::uuid
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Add foreign key constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE user_points ADD CONSTRAINT fk_user_points_profiles 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        ALTER TABLE user_point_awards ADD CONSTRAINT fk_user_point_awards_profiles 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        INSERT INTO user_points (user_id, total_points)
        SELECT id, 0 FROM profiles
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- 11. Create views for easy querying
CREATE OR REPLACE VIEW user_points_with_names AS
SELECT 
    up.id,
    up.user_id,
    p.name as user_name,
    p.email,
    p.avatar,
    up.total_points,
    up.created_at,
    up.updated_at,
    COALESCE(awards_count.count, 0) as total_awards
FROM user_points up
LEFT JOIN profiles p ON up.user_id = p.id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM user_point_awards 
    GROUP BY user_id
) awards_count ON up.user_id = awards_count.user_id;

CREATE OR REPLACE VIEW user_point_awards_detailed AS
SELECT 
    upa.id,
    upa.user_id,
    p.name as user_name,
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
LEFT JOIN kanban_columns from_col ON upa.from_column_id = from_col.id
LEFT JOIN kanban_columns to_col ON upa.to_column_id = to_col.id
LEFT JOIN projects proj ON upa.project_id = proj.id
ORDER BY upa.awarded_at DESC;