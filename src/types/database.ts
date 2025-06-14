
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  position: number;
  assignee?: string | null;
  function_points: number;
  complexity: 'low' | 'medium' | 'high';
  estimated_hours?: number;
  status_image_filenames: string[];
  project_id?: string | null;
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
  entity_type: 'task' | 'project' | 'team_member' | 'column' | 'tag';
  entity_id: string;
  action_type: 'create' | 'update' | 'delete' | 'move';
  old_data?: any;
  new_data?: any;
  changed_by?: string;
  context?: any;
  created_at: string;
}
