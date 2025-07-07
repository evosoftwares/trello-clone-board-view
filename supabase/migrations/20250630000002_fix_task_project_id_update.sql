-- Função para atualizar project_id com tratamento correto de UUID
CREATE OR REPLACE FUNCTION update_task_project_id(
  task_id UUID,
  new_project_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar project_id com cast apropriado
  IF new_project_id IS NULL OR new_project_id = '' THEN
    UPDATE tasks 
    SET project_id = NULL,
        updated_at = NOW()
    WHERE id = task_id;
  ELSE
    -- Validar se é um UUID válido antes de fazer cast
    BEGIN
      UPDATE tasks 
      SET project_id = new_project_id::UUID,
          updated_at = NOW()
      WHERE id = task_id;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Se não for UUID válido, definir como NULL
      UPDATE tasks 
      SET project_id = NULL,
          updated_at = NOW()
      WHERE id = task_id;
    END;
  END IF;
END;
$$;

-- Dar permissões necessárias
GRANT EXECUTE ON FUNCTION update_task_project_id(UUID, TEXT) TO authenticated;