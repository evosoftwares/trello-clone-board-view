
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, TeamMember, Tag, TaskTag } from '@/types/database';

// DEBUG: Ensure no supabase.channel calls remain
// (If you see this log on load, there's a bug)
console.debug('[KANBAN DATA FETCH] Loaded - no Realtime subscriptions here.');

export const useKanbanDataFetch = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async (selectedProjectId?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("[KANBAN FETCH] Fetching data for project:", selectedProjectId);

      // Build tasks query with optional project filter
      let tasksQuery = supabase.from('tasks').select('*').order('position');
      
      if (selectedProjectId) {
        tasksQuery = tasksQuery.eq('project_id', selectedProjectId);
      }

      const [columnsRes, tasksRes, membersRes, tagsRes, taskTagsRes] = await Promise.all([
        supabase.from('kanban_columns').select('*').order('position'),
        tasksQuery,
        supabase.from('team_members').select('*').order('name'),
        supabase.from('tags').select('*').order('name'),
        supabase.from('task_tags').select('*')
      ]);

      if (columnsRes.error) throw columnsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (membersRes.error) throw membersRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (taskTagsRes.error) throw taskTagsRes.error;

      setColumns((columnsRes.data || []) as KanbanColumn[]);
      setTasks((tasksRes.data || []) as Task[]);
      setTeamMembers((membersRes.data || []) as TeamMember[]);
      setTags((tagsRes.data || []) as Tag[]);
      setTaskTags((taskTagsRes.data || []) as TaskTag[]);
      
      console.log("[KANBAN FETCH] Data fetched successfully");
    } catch (err: any) {
      console.error('[KANBAN FETCH] Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    columns,
    tasks,
    teamMembers,
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setTeamMembers,
    setTags,
    setTaskTags
  };
};
