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
    const originalTasks = tasks;
    
    try {
      // Get all tasks in the destination column
      const destinationTasks = tasks
        .filter(task => task.column_id === newColumnId && task.id !== taskId)
        .sort((a, b) => a.position - b.position);
      
      // Calculate new positions for all affected tasks
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, column_id: newColumnId, position: newPosition };
        }
        
        // If task is in the destination column, adjust positions
        if (task.column_id === newColumnId) {
          if (newPosition <= task.position) {
            return { ...task, position: task.position + 1 };
          }
        }
        
        return task;
      });
      
      // Optimistic update
      setTasks(updatedTasks);

      // Update the moved task
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ 
          column_id: newColumnId, 
          position: newPosition 
        })
        .eq('id', taskId);

      if (moveError) throw moveError;

      // Update positions of other tasks in the destination column
      const tasksToUpdate = destinationTasks
        .filter(task => task.position >= newPosition)
        .map(task => ({
          id: task.id,
          position: task.position + 1
        }));

      if (tasksToUpdate.length > 0) {
        for (const taskUpdate of tasksToUpdate) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ position: taskUpdate.position })
            .eq('id', taskUpdate.id);
          
          if (updateError) throw updateError;
        }
      }

      // Fetch fresh data to ensure consistency
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (fetchError) throw fetchError;
      
      setTasks(freshTasks as Task[]);

    } catch (err: any) {
      console.error('Error moving task:', err);
      setError(err.message);
      // Revert on error
      setTasks(originalTasks);
    }
  }, [tasks, setTasks, setError]);

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

  return {
    moveTask,
    createTask,
    updateTask,
    deleteTask
  };
};
