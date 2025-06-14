
-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'developer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios perfis
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem apenas seus próprios perfis
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para permitir que todos vejam perfis (para seleção de assignees)
CREATE POLICY "Users can view all profiles for assignment" ON public.profiles
  FOR SELECT USING (true);

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para executar a função quando um usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualizar tabela tasks para referenciar profiles ao invés de texto livre
ALTER TABLE public.tasks 
ALTER COLUMN assignee TYPE UUID USING NULL;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_assignee_fkey 
FOREIGN KEY (assignee) REFERENCES public.profiles(id);

-- Atualizar tabela activity_log para incluir user_id
ALTER TABLE public.activity_log 
ADD COLUMN user_id UUID REFERENCES public.profiles(id);

-- Trigger para automaticamente capturar user_id nas atividades
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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

    -- Inserir log com user_id
    INSERT INTO activity_log (
        entity_type,
        entity_id,
        action_type,
        old_data,
        new_data,
        user_id,
        context
    ) VALUES (
        'task',
        COALESCE(NEW.id, OLD.id),
        action_type,
        old_data,
        new_data,
        auth.uid(), -- Capturar usuário logado automaticamente
        jsonb_build_object(
            'project_id', COALESCE(NEW.project_id, OLD.project_id),
            'column_id', COALESCE(NEW.column_id, OLD.column_id)
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;
