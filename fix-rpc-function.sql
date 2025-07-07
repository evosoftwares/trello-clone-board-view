-- Fix for the RPC function error
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
    new_column_id UUID;
BEGIN
    -- Log para debugging
    RAISE NOTICE 'Updating task positions with points system. Task ID: %, Column changed: %', p_task_id, p_column_changed;
    RAISE NOTICE 'Updates to apply: %', p_updates;
    
    -- If column changed, check if it's a completion
    IF p_column_changed THEN
        -- Get task details first
        SELECT * INTO task_record FROM tasks WHERE id = p_task_id;
        
        -- Only proceed if task exists
        IF FOUND THEN
            -- Get old column name
            SELECT title INTO old_column_name FROM kanban_columns WHERE id = task_record.column_id;
            
            -- Find the new column from updates
            FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
            LOOP
                IF (update_record->>'id')::uuid = p_task_id THEN
                    new_column_id := (update_record->>'column_id')::uuid;
                    SELECT title INTO new_column_name 
                    FROM kanban_columns 
                    WHERE id = new_column_id;
                    
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
    END IF;
    
    -- Update all tasks atomically
    FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        RAISE NOTICE 'Updating task % to column % position %', 
            (update_record->>'id')::uuid, 
            (update_record->>'column_id')::uuid, 
            (update_record->>'position')::integer;
            
        -- If it's the task being moved and column changed, update timestamp
        IF (update_record->>'id')::uuid = p_task_id AND p_column_changed THEN
            UPDATE tasks 
            SET 
                column_id = (update_record->>'column_id')::uuid,
                position = (update_record->>'position')::integer,
                current_status_start_time = current_timestamp
            WHERE id = (update_record->>'id')::uuid;
        ELSE
            -- Normal position update
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
            new_column_id, -- to column
            task_record.project_id::uuid
        );
    END IF;
    
    RAISE NOTICE 'Task positioning and points update completed successfully';
END;
$$ LANGUAGE plpgsql;