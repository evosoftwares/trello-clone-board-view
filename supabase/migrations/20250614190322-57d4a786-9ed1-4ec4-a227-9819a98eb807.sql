
-- 1. Normalizar posições em todas as colunas para serem sequenciais
-- Primeiro, vamos criar uma função para normalizar as posições
CREATE OR REPLACE FUNCTION normalize_task_positions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    col_record RECORD;
    task_record RECORD;
    new_position INTEGER;
BEGIN
    -- Para cada coluna
    FOR col_record IN SELECT id FROM kanban_columns LOOP
        new_position := 0;
        
        -- Para cada tarefa na coluna, ordenada por posição atual e created_at
        FOR task_record IN 
            SELECT id 
            FROM tasks 
            WHERE column_id = col_record.id 
            ORDER BY position ASC, created_at ASC
        LOOP
            -- Atualizar para nova posição sequencial
            UPDATE tasks 
            SET position = new_position 
            WHERE id = task_record.id;
            
            new_position := new_position + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Task positions normalized successfully';
END;
$$;

-- 2. Executar a normalização
SELECT normalize_task_positions();

-- 3. Criar índices para melhorar performance das consultas de posição
CREATE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_position_created ON tasks(position, created_at);

-- 4. Criar função para validar posições sequenciais
CREATE OR REPLACE FUNCTION validate_task_positions()
RETURNS TABLE(column_id uuid, has_duplicates boolean, max_gap integer)
LANGUAGE plpgsql
AS $$
DECLARE
    col_record RECORD;
    pos_count INTEGER;
    expected_count INTEGER;
    max_pos INTEGER;
BEGIN
    FOR col_record IN SELECT id FROM kanban_columns LOOP
        -- Contar tarefas na coluna
        SELECT COUNT(*) INTO pos_count FROM tasks WHERE tasks.column_id = col_record.id;
        
        -- Pegar maior posição
        SELECT COALESCE(MAX(position), -1) INTO max_pos FROM tasks WHERE tasks.column_id = col_record.id;
        
        -- Se há tarefas, a maior posição deve ser count-1
        expected_count := CASE WHEN pos_count > 0 THEN pos_count - 1 ELSE 0 END;
        
        RETURN QUERY SELECT 
            col_record.id,
            (pos_count > 0 AND max_pos != expected_count) as has_duplicates,
            CASE WHEN pos_count > 0 THEN max_pos - expected_count ELSE 0 END as max_gap;
    END LOOP;
END;
$$;
