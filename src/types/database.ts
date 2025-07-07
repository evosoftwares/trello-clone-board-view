export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  deadline?: string;
  budget?: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  position: number;
  assignee?: string | null; // UUID referenciando profiles
  function_points: number;
  complexity: string; // Alterado para string ao invés do union type restritivo
  estimated_hours?: number;
  status_image_filenames: string[];
  project_id?: string | null;
  current_status_start_time?: string | null; // Novo campo para cronometragem
  last_column_id?: string | null; // Novo campo para controle
  last_assignee?: string | null; // Novo campo para controle
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
}

export interface FunctionPointsHistory {
  id: string;
  task_id: string;
  old_points?: number;
  new_points?: number;
  old_complexity?: string;
  new_complexity?: string;
  changed_by?: string;
  reason?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: 'task' | 'project' | 'team_member' | 'column' | 'tag' | 'task_comment';
  entity_id: string;
  action_type: 'create' | 'update' | 'delete' | 'move';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changed_by?: string;
  user_id?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface UserPointAward {
  id: string;
  user_id: string;
  task_id: string;
  points_awarded: number;
  awarded_at: string;
  task_title: string;
  task_complexity: string;
  from_column_id?: string;
  to_column_id: string;
  project_id?: string;
}

export interface UserPointsWithNames {
  id: string;
  user_id: string;
  user_name: string;
  email?: string;
  avatar?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
  total_awards: number;
}

export interface UserPointAwardDetailed {
  id: string;
  user_id: string;
  user_name: string;
  task_id: string;
  task_title: string;
  points_awarded: number;
  task_complexity: string;
  awarded_at: string;
  from_column_name?: string;
  to_column_name: string;
  project_name?: string;
  project_color?: string;
}
