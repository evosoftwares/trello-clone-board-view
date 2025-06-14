
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  
  // Função auxiliar para calcular novas posições - VERSÃO ROBUSTA
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

    console.log('[CALCULATE POSITIONS] Task to move:', {
      taskId,
      from: { columnId: oldColumnId, currentPosition: taskToMove.position },
      to: { columnId: newColumnId, newPosition }
    });

    if (oldColumnId === newColumnId) {
      // MOVIMENTO DENTRO DA MESMA COLUNA
      const columnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      console.log('[CALCULATE POSITIONS] Column tasks before move:', 
        columnTasks.map(t => ({ id: t.id, title: t.title, position: t.position })));

      // Criar array de IDs ordenado por posição atual
      const taskIds = columnTasks.map(t => t.id);
      
      // Remover a tarefa que está sendo movida
      const currentIndex = taskIds.indexOf(taskId);
      if (currentIndex === -1) return [];
      
      taskIds.splice(currentIndex, 1);
      
      // Inserir na nova posição
      const targetIndex = Math.min(Math.max(0, newPosition), taskIds.length);
      taskIds.splice(targetIndex, 0, taskId);

      console.log('[CALCULATE POSITIONS] New order:', taskIds);

      // Gerar updates para todas as tarefas que mudaram de posição
      taskIds.forEach((id, index) => {
        const task = columnTasks.find(t => t.id === id);
        if (task && task.position !== index) {
          updates.push({
            id: id,
            column_id: newColumnId,
            position: index
          });
        }
      });

    } else {
      // MOVIMENTO ENTRE COLUNAS DIFERENTES
      
      // 1. Reorganizar coluna de origem (remover a tarefa)
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

      // 2. Reorganizar coluna de destino (inserir a tarefa)
      const newColumnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      // Criar array de IDs da coluna de destino
      const newColumnTaskIds = newColumnTasks.map(t => t.id);
      
      // Inserir a tarefa na posição correta
      const insertPosition = Math.min(Math.max(0, newPosition), newColumnTaskIds.length);
      newColumnTaskIds.splice(insertPosition, 0, taskId);

      // Gerar updates para todas as tarefas da coluna de destino
      newColumnTaskIds.forEach((id, index) => {
        updates.push({
          id: id,
          column_id: newColumnId,
          position: index
        });
      });
    }

    console.log('[CALCULATE POSITIONS] Final updates:', updates);
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

  // Função auxiliar para registrar atividade manualmente quando necessário
  const logActivity = async (
    entityType: string,
    entityId: string,
    actionType: string,
    oldData?: any,
    newData?: any,
    context?: any
  ) => {
    try {
      await supabase.from('activity_log').insert({
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        old_data: oldData,
        new_data: newData,
        changed_by: 'Sistema', // Placeholder - em produção seria o usuário logado
        context: context
      });
    } catch (err) {
      console.warn('Error logging activity:', err);
    }
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
    const taskToMove = tasks.find(t => t.id === taskId);

    // 1. Aplicar mudanças otimisticamente no estado local
    setTasks(currentTasks => applyLocalChanges(currentTasks, updates));

    try {
      // 2. Aplicar todas as mudanças no banco usando a função RPC
      const { error } = await supabase.rpc('update_multiple_task_positions', {
        updates: updates
      });

      if (error) {
        console.error('[MOVE TASK] RPC error, falling back to individual updates:', error);
        
        // Fallback: fazer updates individuais em paralelo
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
      }

      // 3. Log da movimentação (adicional ao trigger automático)
      if (taskToMove && taskToMove.column_id !== newColumnId) {
        await logActivity(
          'task',
          taskId,
          'move',
          { column_id: taskToMove.column_id, position: taskToMove.position },
          { column_id: newColumnId, position: newPosition },
          { 
            from_column: taskToMove.column_id,
            to_column: newColumnId,
            project_id: taskToMove.project_id
          }
        );
      }

      console.log('[MOVE TASK] Database sync completed successfully');

      // 4. Validar se as posições estão corretas (opcional)
      try {
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
      } catch (validationErr) {
        console.warn('[MOVE TASK] Validation step failed, but move was successful:', validationErr);
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
    const originalTask = tasks.find(t => t.id === taskId);
    
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
    const taskToDelete = tasks.find(t => t.id === taskId);
    
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
