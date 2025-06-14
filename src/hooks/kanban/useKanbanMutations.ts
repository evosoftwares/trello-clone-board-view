
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  
  // Função auxiliar para calcular novas posições
  const calculateNewPositions = (
    allTasks: Task[],
    taskId: string,
    newColumnId: string,
    newPosition: number
  ) => {
    const taskToMove = allTasks.find(t => t.id === taskId);
    if (!taskToMove) return [];

    const updates: Array<{ id: string; column_id: string; position: number }> = [];
    const oldColumnId = taskToMove.column_id;

    // Se movendo dentro da mesma coluna
    if (oldColumnId === newColumnId) {
      const columnTasks = allTasks
        .filter(t => t.column_id === newColumnId && t.id !== taskId)
        .sort((a, b) => a.position - b.position);

      // Inserir a tarefa na nova posição
      columnTasks.splice(newPosition, 0, { ...taskToMove, position: newPosition });

      // Recalcular todas as posições da coluna
      columnTasks.forEach((task, index) => {
        if (task.position !== index) {
          updates.push({
            id: task.id,
            column_id: newColumnId,
            position: index
          });
        }
      });
    } else {
      // Movendo entre colunas diferentes
      
      // 1. Reordenar coluna de origem (remover a tarefa)
      const oldColumnTasks = allTasks
        .filter(t => t.column_id === oldColumnId && t.id !== taskId)
        .sort((a, b) => a.position - b.position);

      oldColumnTasks.forEach((task, index) => {
        if (task.position !== index) {
          updates.push({
            id: task.id,
            column_id: oldColumnId,
            position: index
          });
        }
      });

      // 2. Reordenar coluna de destino (inserir a tarefa)
      const newColumnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      // Inserir a tarefa na nova posição
      newColumnTasks.splice(newPosition, 0, { ...taskToMove, column_id: newColumnId, position: newPosition });

      // Recalcular todas as posições da coluna de destino
      newColumnTasks.forEach((task, index) => {
        updates.push({
          id: task.id,
          column_id: newColumnId,
          position: index
        });
      });
    }

    return updates;
  };

  // Função para aplicar mudanças no estado local
  const applyLocalChanges = (
    currentTasks: Task[],
    updates: Array<{ id: string; column_id: string; position: number }>
  ): Task[] => {
    const updatedTasks = [...currentTasks];
    
    updates.forEach(update => {
      const taskIndex = updatedTasks.findIndex(t => t.id === update.id);
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          column_id: update.column_id,
          position: update.position
        };
      }
    });

    return updatedTasks;
  };

  const moveTask = useCallback(async (taskId: string, newColumnId: string, newPosition: number) => {
    console.log('[MOVE TASK] Starting move:', {
      taskId,
      to: newColumnId,
      newPosition
    });

    // Calcular todas as mudanças necessárias
    const updates = calculateNewPositions(tasks, taskId, newColumnId, newPosition);
    
    if (updates.length === 0) {
      console.log('[MOVE TASK] No updates needed');
      return;
    }

    console.log('[MOVE TASK] Calculated updates:', updates);

    // Backup do estado atual para rollback
    const originalTasks = tasks;

    // 1. Aplicar mudanças otimisticamente no estado local
    setTasks(currentTasks => applyLocalChanges(currentTasks, updates));

    try {
      // 2. Aplicar todas as mudanças no banco em uma transação
      const { error } = await supabase.rpc('update_multiple_task_positions', {
        updates: updates
      });

      // Se a função RPC não existir, fazer updates individuais em paralelo
      if (error && error.message.includes('function update_multiple_task_positions')) {
        console.log('[MOVE TASK] Using individual updates');
        
        const updatePromises = updates.map(update =>
          supabase
            .from('tasks')
            .update({ 
              column_id: update.column_id, 
              position: update.position 
            })
            .eq('id', update.id)
        );

        const results = await Promise.all(updatePromises);
        const failedUpdate = results.find(result => result.error);
        
        if (failedUpdate?.error) {
          throw failedUpdate.error;
        }
      } else if (error) {
        throw error;
      }

      console.log('[MOVE TASK] Database sync completed successfully');

      // 3. Validar se as posições estão corretas
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_task_positions');

      if (validationError) {
        console.warn('[MOVE TASK] Validation error:', validationError);
      } else if (validationData && validationData.some((col: any) => col.has_duplicates)) {
        console.warn('[MOVE TASK] Position inconsistencies detected, normalizing...');
        await supabase.rpc('normalize_task_positions');
        
        // Recarregar dados após normalização
        const { data: freshTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .order('column_id')
          .order('position', { ascending: true });

        if (!fetchError && freshTasks) {
          setTasks(freshTasks as Task[]);
        }
      }

    } catch (err: any) {
      console.error('[MOVE TASK] Error syncing with database:', err);
      setError(`Erro ao mover tarefa: ${err.message}`);
      
      // Rollback para o estado original
      setTasks(originalTasks);
      
      // Tentar recarregar dados frescos do banco
      try {
        const { data: freshTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .order('column_id')
          .order('position', { ascending: true });

        if (!fetchError && freshTasks) {
          setTasks(freshTasks as Task[]);
        }
      } catch (revertError) {
        console.error('[MOVE TASK] Error reverting state:', revertError);
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
      
      const { error } = await supabase.rpc('normalize_task_positions');
      if (error) throw error;

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
