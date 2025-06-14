import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  const moveTask = useCallback(async (taskId: string, newColumnId: string, newPosition: number) => {
    console.log('[MOVE TASK] Starting move:', {
      taskId,
      to: newColumnId,
      newPosition
    });

    // Step 1: Update local state immediately (optimistic update)
    setTasks(currentTasks => {
      const updatedTasks = [...currentTasks];
      
      // Find the task to move
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return currentTasks;
      
      // Update the task directly in place
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        column_id: newColumnId,
        position: newPosition
      };
      
      console.log('[MOVE TASK] Local state updated immediately');
      return updatedTasks;
    });

    // Step 2: Sync with Supabase in background
    try {
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ 
          column_id: newColumnId, 
          position: newPosition 
        })
        .eq('id', taskId);

      if (moveError) throw moveError;

      console.log('[MOVE TASK] Database sync completed successfully');

    } catch (err: any) {
      console.error('Error syncing with database:', err);
      setError(err.message);
      
      // Revert local state by fetching fresh data
      try {
        const { data: freshTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .order('column_id')
          .order('position', { ascending: true });

        if (fetchError) {
          console.error('Error fetching fresh data:', fetchError);
        } else if (freshTasks) {
          setTasks(freshTasks as Task[]);
        }
      } catch (revertError) {
        console.error('Error reverting state:', revertError);
      }
    }
  }, [setTasks, setError]);

  const createTask = useCallback(async (columnId: string, title: string, projectId?: string | null) => {
    try {
      // Find the highest position in the target column
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

      if (projectId) {
        taskData.project_id = projectId;
      }

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

      console.log('[CREATE TASK] Task created successfully');
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message);
    }
  }, [tasks, setError]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => {
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
  }, [tasks, setTasks, setError]);

  const deleteTask = useCallback(async (taskId: string) => {
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
  }, [tasks, setTasks, setError]);

  const fixAllPositions = useCallback(async () => {
    try {
      console.log('[FIX POSITIONS] Starting position normalization...');
      
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('id');

      if (columnsError) throw columnsError;

      if (columns) {
        for (const column of columns) {
          const { data: columnTasks, error: fetchError } = await supabase
            .from('tasks')
            .select('id, position')
            .eq('column_id', column.id)
            .order('position', { ascending: true });

          if (fetchError) throw fetchError;

          if (columnTasks && columnTasks.length > 0) {
            const updates = columnTasks.map((task, index) => 
              supabase.from('tasks').update({ position: index }).eq('id', task.id)
            );
            
            await Promise.all(updates);
          }
        }
      }

      // Fetch fresh data
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('column_id')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;
      
      if (freshTasks) {
        setTasks(freshTasks as Task[]);
      }
      
      console.log('[FIX POSITIONS] Position normalization completed');
    } catch (err: any) {
      console.error('Error fixing positions:', err);
      setError(err.message);
    }
  }, [setTasks, setError]);

  return {
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    fixAllPositions
  };
};
