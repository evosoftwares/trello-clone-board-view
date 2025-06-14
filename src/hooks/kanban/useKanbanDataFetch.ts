
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, TeamMember, Tag, TaskTag } from '@/types/database';

console.debug('[KANBAN DATA FETCH] Loaded - optimized for position handling.');

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

      // Build tasks query with proper ordering
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
        .order('column_id')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      
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

      const fetchedTasks = (tasksRes.data || []) as Task[];
      
      // Log task positions for debugging
      console.log("[KANBAN FETCH] Tasks by column:", 
        fetchedTasks.reduce((acc, task) => {
          if (!acc[task.column_id]) acc[task.column_id] = [];
          acc[task.column_id].push({ id: task.id, title: task.title, position: task.position });
          return acc;
        }, {} as Record<string, any[]>)
      );

      setColumns((columnsRes.data || []) as KanbanColumn[]);
      setTasks(fetchedTasks);
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
