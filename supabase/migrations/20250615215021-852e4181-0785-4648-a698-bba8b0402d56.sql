
-- Criar tabela para histórico de tempo de tarefas
CREATE TABLE public.task_time_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id),
  column_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos para controle de tempo atual nas tarefas
ALTER TABLE public.tasks 
ADD COLUMN current_status_start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN last_column_id UUID,
ADD COLUMN last_assignee UUID;

-- Criar índices para melhor performance
CREATE INDEX idx_task_time_log_task_id ON task_time_log(task_id);
CREATE INDEX idx_task_time_log_dates ON task_time_log(start_time, end_time);
CREATE INDEX idx_tasks_current_status ON tasks(current_status_start_time);

-- Função para registrar tempo quando tarefa muda de estado
CREATE OR REPLACE FUNCTION log_task_time_change()
RETURNS TRIGGER AS $$
DECLARE
    duration_calc INTEGER;
    old_column_name TEXT;
    old_user_name TEXT;
BEGIN
    -- Só processa se não é INSERT (criação inicial)
    IF TG_OP = 'UPDATE' AND OLD.current_status_start_time IS NOT NULL THEN
        
        -- Verifica se houve mudança de coluna ou responsável
        IF (OLD.column_id IS DISTINCT FROM NEW.column_id) OR 
           (OLD.assignee IS DISTINCT FROM NEW.assignee) THEN
            
            -- Calcula duração em segundos
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
            
            -- Insere registro no histórico apenas se a duração for positiva
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

-- Criar trigger para executar a função
CREATE TRIGGER task_time_tracking_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION log_task_time_change();

-- Atualizar registros existentes com timestamp atual
UPDATE tasks 
SET current_status_start_time = COALESCE(current_status_start_time, created_at, now()),
    last_column_id = column_id,
    last_assignee = assignee
WHERE current_status_start_time IS NULL;

-- Habilitar realtime para a nova tabela
ALTER PUBLICATION supabase_realtime ADD TABLE task_time_log;
ALTER TABLE task_time_log REPLICA IDENTITY FULL;
