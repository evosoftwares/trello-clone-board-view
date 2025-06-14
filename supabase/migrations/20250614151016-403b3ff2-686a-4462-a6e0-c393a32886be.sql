
-- 1. Criar a tabela de projetos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  start_date DATE,
  deadline DATE,
  budget DECIMAL(10,2),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_projects_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at_column();

-- 3. Adicionar coluna project_id na tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- 4. RLS (por enquanto permissiva, igual outras tabelas)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on projects" ON public.projects FOR ALL USING (true);

-- 5. Habilita realtime para a tabela de projetos
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER TABLE projects REPLICA IDENTITY FULL;
