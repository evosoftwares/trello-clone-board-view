
-- Função para atualização atomizada de tarefa com tracking de tempo
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
    -- Atualizar todas as tarefas atomicamente
    FOR update_record IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
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
END;
$$ LANGUAGE plpgsql;

-- Função para atualização de responsável com tracking de tempo
CREATE OR REPLACE FUNCTION update_task_assignee_with_time_tracking(
    p_task_id UUID,
    p_new_assignee UUID,
    p_other_updates JSONB
)
RETURNS VOID AS $$
DECLARE
    current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
    key TEXT;
    value JSONB;
    sql_query TEXT := 'UPDATE tasks SET assignee = $1, current_status_start_time = $2';
    counter INTEGER := 3;
BEGIN
    -- Construir query dinamicamente para outros updates
    FOR key, value IN SELECT * FROM jsonb_each(p_other_updates)
    LOOP
        IF key != 'assignee' AND value IS NOT NULL THEN
            sql_query := sql_query || ', ' || key || ' = $' || counter;
            counter := counter + 1;
        END IF;
    END LOOP;
    
    sql_query := sql_query || ' WHERE id = $' || counter;
    
    -- Executar a query construída
    IF counter = 3 THEN
        -- Apenas assignee e timestamp
        EXECUTE sql_query USING p_new_assignee, current_timestamp, p_task_id;
    ELSE
        -- Tem outros campos para atualizar - seria mais complexo, então fazer update simples
        UPDATE tasks 
        SET 
            assignee = p_new_assignee,
            current_status_start_time = current_timestamp
        WHERE id = p_task_id;
        
        -- Aplicar outros updates se existirem
        FOR key, value IN SELECT * FROM jsonb_each(p_other_updates)
        LOOP
            IF key != 'assignee' AND value IS NOT NULL THEN
                EXECUTE format('UPDATE tasks SET %I = $1 WHERE id = $2', key) 
                USING (value #>> '{}'), p_task_id;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Melhorar o trigger existente para ser mais preciso
DROP TRIGGER IF EXISTS task_time_tracking_trigger ON tasks;

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
            
            -- Busca nome do responsável anterior
            IF OLD.assignee IS NOT NULL THEN
                SELECT name INTO old_user_name 
                FROM profiles 
                WHERE id = OLD.assignee;
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

-- Recriar o trigger
CREATE TRIGGER task_time_tracking_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION log_task_time_change();

-- Garantir que tarefas existentes tenham timestamp inicial
UPDATE tasks 
SET current_status_start_time = COALESCE(current_status_start_time, created_at, NOW())
WHERE current_status_start_time IS NULL;
