
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, TeamMember, Tag, TaskTag } from '@/types/database';

export const useKanbanData = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [columnsRes, tasksRes, membersRes, tagsRes, taskTagsRes] = await Promise.all([
        supabase.from('kanban_columns').select('*').order('position'),
        supabase.from('tasks').select('*').order('position'),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('tags').select('*').order('name'),
        supabase.from('task_tags').select('*')
      ]);

      if (columnsRes.error) throw columnsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (membersRes.error) throw membersRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (taskTagsRes.error) throw taskTagsRes.error;

      setColumns(columnsRes.data || []);
      setTasks(tasksRes.data || []);
      setTeamMembers(membersRes.data || []);
      setTags(tagsRes.data || []);
      setTaskTags(taskTagsRes.data || []);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('kanban-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'kanban_columns' },
        () => fetchAllData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchAllData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'team_members' },
        () => fetchAllData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          column_id: newColumnId, 
          position: newPosition 
        })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error moving task:', err);
      setError(err.message);
    }
  };

  const createTask = async (columnId: string, title: string) => {
    try {
      const maxPosition = Math.max(
        ...tasks.filter(t => t.column_id === columnId).map(t => t.position), 
        -1
      );

      const { error } = await supabase
        .from('tasks')
        .insert({
          title,
          column_id: columnId,
          position: maxPosition + 1,
          function_points: 1,
          complexity: 'medium',
          status_image_filenames: ['tarefas.svg']
        });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message);
    }
  };

  return {
    columns,
    tasks,
    teamMembers,
    tags,
    taskTags,
    loading,
    error,
    moveTask,
    createTask,
    refreshData: fetchAllData
  };
};
