
export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
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
  assignee?: string;
  function_points: number;
  complexity: string; // Changed from union type to string to match Supabase
  estimated_hours?: number;
  status_image_filenames: string[];
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
