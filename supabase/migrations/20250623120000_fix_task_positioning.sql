-- Melhoria na função de atualização de posições para suportar reposicionamento preciso
CREATE OR REPLACE FUNCTION update_task_with_time_tracking(
    p_task_id UUID,
    p_updates JSONB,
    p_column_changed BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    update_record JSONB;
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Log para debugging
    RAISE NOTICE 'Updating task positions. Task ID: %, Column changed: %', p_task_id, p_column_changed;
    RAISE NOTICE 'Updates to apply: %', p_updates;
    
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
    
    RAISE NOTICE 'Task positioning update completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para verificar consistência de posições
CREATE OR REPLACE FUNCTION check_position_consistency()
RETURNS TABLE(column_id UUID, issues TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.column_id,
        'Gap in positions: ' || string_agg(t.position::text, ', ' ORDER BY t.position) as issues
    FROM tasks t
    WHERE t.column_id IN (
        SELECT DISTINCT tasks.column_id 
        FROM tasks 
        GROUP BY tasks.column_id, tasks.position 
        HAVING COUNT(*) > 1
    )
    GROUP BY t.column_id;
END;
$$ LANGUAGE plpgsql;

-- Função para normalizar todas as posições (utilitário de manutenção)
CREATE OR REPLACE FUNCTION normalize_all_task_positions()
RETURNS VOID AS $$
DECLARE
    col_record RECORD;
    task_record RECORD;
    new_position INTEGER;
BEGIN
    -- Para cada coluna
    FOR col_record IN SELECT DISTINCT column_id FROM tasks ORDER BY column_id
    LOOP
        new_position := 0;
        
        -- Para cada tarefa na coluna, ordenada pela posição atual
        FOR task_record IN 
            SELECT id FROM tasks 
            WHERE column_id = col_record.column_id 
            ORDER BY position, created_at
        LOOP
            UPDATE tasks 
            SET position = new_position 
            WHERE id = task_record.id;
            
            new_position := new_position + 1;
        END LOOP;
        
        RAISE NOTICE 'Normalized % tasks in column %', new_position, col_record.column_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;