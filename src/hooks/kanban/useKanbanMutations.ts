
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  // Helper function to normalize positions in a column
  const normalizeColumnPositions = useCallback(async (columnId: string) => {
    try {
      const { data: columnTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('column_id', columnId)
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      if (columnTasks && columnTasks.length > 0) {
        const updates = columnTasks.map((task, index) => ({
          id: task.id,
          position: index
        }));

        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ position: update.position })
            .eq('id', update.id);
          
          if (updateError) throw updateError;
        }
      }
    } catch (err) {
      console.error('Error normalizing column positions:', err);
      throw err;
    }
  }, []);

  const moveTask = useCallback(async (taskId: string, newColumnId: string, newPosition: number) => {
    const originalTasks = tasks;
    
    try {
      // Find the task being moved
      const movedTask = tasks.find(task => task.id === taskId);
      if (!movedTask) return;

      const isMovingToSameColumn = movedTask.column_id === newColumnId;
      const sourceColumnId = movedTask.column_id;

      console.log('[MOVE TASK] Moving task:', {
        taskId,
        from: sourceColumnId,
        to: newColumnId,
        newPosition,
        sameColumn: isMovingToSameColumn
      });

      // Step 1: Update the moved task's column and position
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ 
          column_id: newColumnId, 
          position: newPosition 
        })
        .eq('id', taskId);

      if (moveError) throw moveError;

      // Step 2: Normalize positions in the destination column
      await normalizeColumnPositions(newColumnId);

      // Step 3: If moving between different columns, normalize source column too
      if (!isMovingToSameColumn) {
        await normalizeColumnPositions(sourceColumnId);
      }

      // Step 4: Fetch fresh data to ensure consistency
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (fetchError) throw fetchError;
      
      setTasks(freshTasks as Task[]);

      console.log('[MOVE TASK] Task moved successfully');

    } catch (err: any) {
      console.error('Error moving task:', err);
      setError(err.message);
      // Revert on error
      setTasks(originalTasks);
    }
  }, [tasks, setTasks, setError, normalizeColumnPositions]);

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

  // Utility function to fix position inconsistencies
  const fixAllPositions = useCallback(async () => {
    try {
      console.log('[FIX POSITIONS] Starting position normalization...');
      
      // Get all columns
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('id');

      if (columnsError) throw columnsError;

      // Normalize positions for each column
      for (const column of columns || []) {
        await normalizeColumnPositions(column.id);
      }

      // Fetch fresh data
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (fetchError) throw fetchError;
      
      setTasks(freshTasks as Task[]);
      
      console.log('[FIX POSITIONS] Position normalization completed');
    } catch (err: any) {
      console.error('Error fixing positions:', err);
      setError(err.message);
    }
  }, [normalizeColumnPositions, setTasks, setError]);

  return {
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    fixAllPositions
  };
};
