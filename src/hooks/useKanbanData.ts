import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, TeamMember, Tag, TaskTag } from '@/types/database';

export const useKanbanData = (selectedProjectId?: string | null) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchAllData = useCallback(async () => {
    try {
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
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchAllData();

    // Always cleanup before creating a new channel
    if (channelRef.current) {
      try {
        console.log("[KANBAN DATA] Cleaning up previous channel...");
        // Unsubscribe from previous channel if exists
        channelRef.current.unsubscribe();
      } catch (e) {
        console.warn("[KANBAN DATA] Error on previous channel unsubscribe:", e);
      }
      channelRef.current = null;
    }

    const timestamp = Date.now();
    const channelName = selectedProjectId
      ? `kanban-${selectedProjectId}-${timestamp}`
      : `kanban-all-${timestamp}`;

    console.log("[KANBAN DATA] Creating new channel:", channelName);

    // Create a new channel
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime: Task INSERT received', payload.new);
        const newTask = payload.new as Task;
        if (!selectedProjectId || newTask.project_id === selectedProjectId) {
          setTasks(currentTasks => {
            if (currentTasks.some(t => t.id === newTask.id)) return currentTasks;
            return [...currentTasks, newTask];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime: Task UPDATE received', payload.new);
        const updatedTask = payload.new as Task;
        setTasks(currentTasks => {
          if (selectedProjectId && updatedTask.project_id !== selectedProjectId) {
            return currentTasks.filter(task => task.id !== updatedTask.id);
          }
          const taskExists = currentTasks.some(task => task.id === updatedTask.id);
          if (taskExists) {
            return currentTasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
          } else if (!selectedProjectId || updatedTask.project_id === selectedProjectId) {
            return [...currentTasks, updatedTask];
          }
          return currentTasks;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime: Task DELETE received', payload.old);
        setTasks(currentTasks => currentTasks.filter(task => task.id !== (payload.old as any).id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => fetchAllData());

    channelRef.current = channel;

    // Subscribe to the new channel ONLY ONCE per instance
    let subscribed = false;
    const subscription = channel.subscribe((status: string) => {
      console.log("[KANBAN DATA] Channel status:", status);
      if (status === "SUBSCRIBED") {
        subscribed = true;
      }
    });

    // Cleanup when effect unmounts or dependencies change
    return () => {
      if (channelRef.current) {
        try {
          console.log("[KANBAN DATA] Cleanup: unsubscribing from", channelName);
          channelRef.current.unsubscribe();
        } catch (e) {
          console.warn("[KANBAN DATA] Error on unsubscribe:", e);
        }
        channelRef.current = null;
      }
    };
  }, [selectedProjectId]);  // no fetchAllData in dependencies

  const moveTask = async (taskId: string, newColumnId: string, newPosition: number) => {
    const originalTasks = tasks;
    
    // Optimistic update
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, column_id: newColumnId, position: newPosition } : task
    );
    setTasks(updatedTasks);

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
      // Revert on error
      setTasks(originalTasks);
    }
  };

  const createTask = async (columnId: string, title: string, projectId?: string | null) => {
    try {
      const maxPosition = Math.max(
        ...tasks.filter(t => t.column_id === columnId).map(t => t.position), 
        -1
      );

      const taskData: any = {
        title,
        column_id: columnId,
        position: maxPosition + 1,
        function_points: 1,
        complexity: 'medium',
        status_image_filenames: ['tarefas.svg']
      };

      // Add project_id if provided
      if (projectId) {
        taskData.project_id = projectId;
      }

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => {
    const originalTasks = tasks;
    
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(updatedTasks);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(currentTasks => 
        currentTasks.map(task => (task.id === data.id ? data as Task : task))
      );
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message);
      setTasks(originalTasks);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    const originalTasks = tasks;
    
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message);
      setTasks(originalTasks);
      throw err;
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
    updateTask,
    deleteTask,
    refreshData: fetchAllData
  };
};
