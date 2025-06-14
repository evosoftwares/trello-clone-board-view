
-- 1. Create kanban_columns table
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create team_members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'developer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  assignee TEXT,
  function_points INTEGER DEFAULT 0,
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  estimated_hours DECIMAL(5,2),
  status_image_filenames TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create task_tags junction table
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(task_id, tag_id)
);

-- 6. Create function_points_history table
CREATE TABLE function_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  old_points INTEGER,
  new_points INTEGER,
  old_complexity TEXT,
  new_complexity TEXT,
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Enable Row Level Security
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_points_history ENABLE ROW LEVEL SECURITY;

-- 8. Create permissive policies for development
CREATE POLICY "Allow all operations on kanban_columns" ON kanban_columns FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on tags" ON tags FOR ALL USING (true);
CREATE POLICY "Allow all operations on task_tags" ON task_tags FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on function_points_history" ON function_points_history FOR ALL USING (true);

-- 9. Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Apply triggers to relevant tables
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert initial data
-- Insert kanban columns
INSERT INTO kanban_columns (title, position, color) VALUES 
('Backlog', 1, '#6B7280'),
('Trabalhando', 2, '#3B82F6'),
('Revisão Devs', 3, '#F59E0B'),
('Concluído', 4, '#10B981');

-- Insert team members
INSERT INTO team_members (name, avatar, role, is_active) VALUES 
('Marcelo', '👨‍💻', 'developer', true),
('Babi', '👩‍💻', 'developer', true),
('Victor', '👨‍💼', 'product_manager', true),
('Gabriel', '👨‍🎨', 'designer', true);

-- Insert default tags
INSERT INTO tags (name, color) VALUES 
('setup', '#EF4444'),
('devops', '#F59E0B'),
('config', '#10B981'),
('ui', '#3B82F6'),
('frontend', '#8B5CF6'),
('auth', '#F59E0B'),
('backend', '#10B981'),
('security', '#EF4444');

-- 12. Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE task_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE function_points_history;

-- 13. Set replica identity for realtime updates
ALTER TABLE kanban_columns REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE tags REPLICA IDENTITY FULL;
ALTER TABLE task_tags REPLICA IDENTITY FULL;
ALTER TABLE team_members REPLICA IDENTITY FULL;
ALTER TABLE function_points_history REPLICA IDENTITY FULL;
