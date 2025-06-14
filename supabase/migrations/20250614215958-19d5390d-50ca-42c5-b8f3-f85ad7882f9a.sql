
-- Criar tabela para log completo de atividades
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'task', 'project', 'team_member', 'column', etc.
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'move'
  old_data JSONB, -- Estado anterior (null para create)
  new_data JSONB, -- Estado novo (null para delete)
  changed_by TEXT, -- Nome ou ID do usuário
  context JSONB, -- Informações adicionais (projeto relacionado, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action_type);

-- Habilitar RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento
CREATE POLICY "Allow all operations on activity_log" ON activity_log FOR ALL USING (true);

-- Função para capturar mudanças em tasks
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    old_data JSONB := NULL;
    new_data JSONB := NULL;
BEGIN
    -- Determinar tipo de ação
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        old_data := to_jsonb(OLD);
    END IF;

    -- Inserir log
    INSERT INTO activity_log (
        entity_type,
        entity_id,
        action_type,
        old_data,
        new_data,
        context
    ) VALUES (
        'task',
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data,
        jsonb_build_object(
            'project_id', COALESCE(NEW.project_id, OLD.project_id),
            'column_id', COALESCE(NEW.column_id, OLD.column_id)
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Função para capturar mudanças em projects
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    old_data JSONB := NULL;
    new_data JSONB := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        old_data := to_jsonb(OLD);
    END IF;

    INSERT INTO activity_log (
        entity_type,
        entity_id,
        action_type,
        old_data,
        new_data
    ) VALUES (
        'project',
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Função para capturar mudanças em team_members
CREATE OR REPLACE FUNCTION log_team_member_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    old_data JSONB := NULL;
    new_data JSONB := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'delete';
        old_data := to_jsonb(OLD);
    END IF;

    INSERT INTO activity_log (
        entity_type,
        entity_id,
        action_type,
        old_data,
        new_data
    ) VALUES (
        'team_member',
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar triggers
CREATE TRIGGER task_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_changes();

CREATE TRIGGER project_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_project_changes();

CREATE TRIGGER team_member_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW EXECUTE FUNCTION log_team_member_changes();

-- Habilitar realtime para activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER TABLE activity_log REPLICA IDENTITY FULL;

-- Função para buscar histórico de uma entidade específica
CREATE OR REPLACE FUNCTION get_entity_history(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    action_type TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action_type,
        al.old_data,
        al.new_data,
        al.changed_by,
        al.context,
        al.created_at
    FROM activity_log al
    WHERE al.entity_type = p_entity_type 
    AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
