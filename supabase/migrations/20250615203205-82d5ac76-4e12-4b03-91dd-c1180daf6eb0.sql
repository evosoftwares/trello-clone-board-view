
-- Função para registrar mudanças nos comentários das tarefas
CREATE OR REPLACE FUNCTION public.log_task_comment_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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

    -- Inserir log de atividade para comentários
    INSERT INTO activity_log (
        entity_type,
        entity_id,
        action_type,
        old_data,
        new_data,
        user_id,
        context
    ) VALUES (
        'task_comment',
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data,
        COALESCE(NEW.user_id, OLD.user_id),
        jsonb_build_object(
            'task_id', COALESCE(NEW.task_id, OLD.task_id),
            'content_preview', LEFT(COALESCE(NEW.content, OLD.content, ''), 100)
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Criar trigger para registrar mudanças nos comentários
CREATE TRIGGER task_comment_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_task_comment_changes();
