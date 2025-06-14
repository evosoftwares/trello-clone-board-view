
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
    const movedTask = tasks.find(task => task.id === taskId);
    if (!movedTask) return;

    const isMovingToSameColumn = movedTask.column_id === newColumnId;
    
    console.log('[MOVE TASK] Starting move:', {
      taskId,
      from: movedTask.column_id,
      to: newColumnId,
      newPosition,
      sameColumn: isMovingToSameColumn
    });

    // Step 1: Update local state first
    setTasks(currentTasks => {
      const updatedTasks = [...currentTasks];
      
      // Remove task from its current position
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return currentTasks;
      
      const [draggedTask] = updatedTasks.splice(taskIndex, 1);
      
      // Update the task with new column and position
      const updatedTask = {
        ...draggedTask,
        column_id: newColumnId,
        position: newPosition
      };
      
      // Get all tasks in the destination column (excluding the moved task)
      const destinationColumnTasks = updatedTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);
      
      // Insert the task at the correct position
      destinationColumnTasks.splice(newPosition, 0, updatedTask);
      
      // Renumber positions in destination column
      destinationColumnTasks.forEach((task, index) => {
        task.position = index;
      });
      
      // If moving between different columns, also renumber the source column
      if (!isMovingToSameColumn) {
        const sourceColumnTasks = updatedTasks
          .filter(t => t.column_id === movedTask.column_id)
          .sort((a, b) => a.position - b.position);
        
        sourceColumnTasks.forEach((task, index) => {
          task.position = index;
        });
      }
      
      // Rebuild the full tasks array
      const otherTasks = updatedTasks.filter(t => 
        t.column_id !== newColumnId && 
        (!isMovingToSameColumn ? t.column_id !== movedTask.column_id : true)
      );
      
      const finalTasks = [
        ...otherTasks,
        ...destinationColumnTasks,
        ...(isMovingToSameColumn ? [] : updatedTasks.filter(t => t.column_id === movedTask.column_id))
      ];
      
      console.log('[MOVE TASK] Local state updated:', {
        destinationColumnTasks: destinationColumnTasks.map(t => ({ id: t.id, title: t.title, position: t.position }))
      });
      
      return finalTasks;
    });

    // Step 2: Sync with Supabase
    try {
      // Update the moved task in database
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ 
          column_id: newColumnId, 
          position: newPosition 
        })
        .eq('id', taskId);

      if (moveError) throw moveError;

      // Normalize positions in destination column
      const { data: destColumnTasks, error: fetchDestError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('column_id', newColumnId)
        .order('position', { ascending: true });

      if (fetchDestError) throw fetchDestError;

      if (destColumnTasks && destColumnTasks.length > 0) {
        const updates = destColumnTasks.map((task, index) => 
          supabase.from('tasks').update({ position: index }).eq('id', task.id)
        );
        
        await Promise.all(updates);
      }

      // If moving between columns, normalize source column too
      if (!isMovingToSameColumn) {
        const { data: sourceColumnTasks, error: fetchSourceError } = await supabase
          .from('tasks')
          .select('id, position')
          .eq('column_id', movedTask.column_id)
          .order('position', { ascending: true });

        if (fetchSourceError) throw fetchSourceError;

        if (sourceColumnTasks && sourceColumnTasks.length > 0) {
          const sourceUpdates = sourceColumnTasks.map((task, index) => 
            supabase.from('tasks').update({ position: index }).eq('id', task.id)
          );
          
          await Promise.all(sourceUpdates);
        }
      }

      console.log('[MOVE TASK] Database sync completed successfully');

    } catch (err: any) {
      console.error('Error syncing with database:', err);
      setError(err.message);
      
      // Revert local state by fetching fresh data
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('column_id')
        .order('position', { ascending: true });

      if (fetchError) {
        console.error('Error fetching fresh data:', fetchError);
      } else {
        setTasks(freshTasks as Task[]);
      }
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

      for (const column of columns || []) {
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

      // Fetch fresh data
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('column_id')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;
      
      setTasks(freshTasks as Task[]);
      
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
