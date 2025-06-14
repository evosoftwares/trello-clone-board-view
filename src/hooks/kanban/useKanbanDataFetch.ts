
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, Profile, Tag, TaskTag } from '@/types/database';

export const useKanbanDataFetch = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async (selectedProjectId?: string | null) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[FETCH] Starting data fetch...');
      
      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position');

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch tasks with project filter
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (selectedProjectId) {
        tasksQuery = tasksQuery.eq('project_id', selectedProjectId);
      } else {
        // If no project selected, show all tasks
        tasksQuery = tasksQuery;
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch profiles (users) instead of team_members
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;
      setTags(tagsData || []);

      // Fetch task tags
      const { data: taskTagsData, error: taskTagsError } = await supabase
        .from('task_tags')
        .select('*');

      if (taskTagsError) throw taskTagsError;
      setTaskTags(taskTagsData || []);

      console.log('[FETCH] Data loaded successfully:', {
        columns: columnsData?.length,
        tasks: tasksData?.length,
        profiles: profilesData?.length,
        tags: tagsData?.length,
        taskTags: taskTagsData?.length
      });

    } catch (err: any) {
      console.error('[FETCH] Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    columns,
    tasks,
    profiles,
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setProfiles,
    setTags,
    setTaskTags
  };
};
