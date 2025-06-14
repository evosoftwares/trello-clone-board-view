
-- Função para atualizar múltiplas posições de tarefas de forma eficiente
CREATE OR REPLACE FUNCTION update_multiple_task_positions(
    updates jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    update_record jsonb;
BEGIN
    -- Para cada update no array
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE tasks 
        SET 
            column_id = (update_record->>'column_id')::uuid,
            position = (update_record->>'position')::integer
        WHERE id = (update_record->>'id')::uuid;
    END LOOP;
END;
$$;
