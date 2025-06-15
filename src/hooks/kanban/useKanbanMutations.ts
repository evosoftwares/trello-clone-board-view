
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();
  
  // Função auxiliar para calcular novas posições - VERSÃO SIMPLIFICADA
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

      const taskIds = columnTasks.map(t => t.id);
      const currentIndex = taskIds.indexOf(taskId);
      if (currentIndex === -1) return [];
      
      taskIds.splice(currentIndex, 1);
      const targetIndex = Math.min(Math.max(0, newPosition), taskIds.length);
      taskIds.splice(targetIndex, 0, taskId);

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
      
      // 1. Reorganizar coluna de origem
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

      // 2. Reorganizar coluna de destino
      const newColumnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      const newColumnTaskIds = newColumnTasks.map(t => t.id);
      const insertPosition = Math.min(Math.max(0, newPosition), newColumnTaskIds.length);
      newColumnTaskIds.splice(insertPosition, 0, taskId);

      newColumnTaskIds.forEach((id, index) => {
        updates.push({
          id: id,
          column_id: newColumnId,
          position: index
        });
      });
    }

    return updates;
  };

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

  const moveTask = useCallback(async (taskId: string, sourceColumnId: string, newColumnId: string) => {
    console.log('[MOVE TASK] Starting move:', { taskId, from: sourceColumnId, to: newColumnId });

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      console.error('[MOVE TASK] Task not found:', taskId);
      return;
    }

    // Calcular nova posição (último na coluna de destino)
    const newPosition = Math.max(
      ...tasks.filter(t => t.column_id === newColumnId).map(t => t.position),
      -1
    ) + 1;

    const updates = calculateNewPositions(tasks, taskId, newColumnId, newPosition);
    if (updates.length === 0) {
      console.log('[MOVE TASK] No updates needed');
      return;
    }

    const originalTasks = tasks;

    // 1. Aplicar mudanças otimisticamente
    setTasks(currentTasks => applyLocalChanges(currentTasks, updates));

    try {
      // 2. Usar stored procedure através de query SQL direta
      const { error: transactionError } = await supabase.rpc(
        'update_task_with_time_tracking' as any,
        {
          p_task_id: taskId,
          p_updates: updates,
          p_column_changed: taskToMove.column_id !== newColumnId
        }
      );

      if (transactionError) {
        throw transactionError;
      }

      // 3. Log da atividade
      if (taskToMove.column_id !== newColumnId) {
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

    } catch (err: any) {
      console.error('[MOVE TASK] Error syncing with database:', err);
      setError(`Erro ao mover tarefa: ${err.message}`);
      setTasks(originalTasks);
    }
  }, [tasks, setTasks, setError, logActivity]);

  const createTask = useCallback(async (title: string, columnId: string, projectId?: string | null) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

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
        status_image_filenames: ['tarefas.svg'],
        // Remover current_status_start_time - será definido automaticamente pelo trigger
      };

      if (projectId) {
        taskData.project_id = projectId;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      // Log da atividade
      await logActivity('task', data.id, 'create', null, data, { project_id: projectId });

      console.log('[CREATE TASK] Task created successfully');
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message);
    }
  }, [tasks, setError, logActivity, user]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    const originalTasks = tasks;
    const originalTask = tasks.find(t => t.id === taskId);
    
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(updatedTasks);

    try {
      // Usar função do banco para garantir timestamp preciso quando houver mudança de responsável
      if (updates.assignee !== undefined && originalTask?.assignee !== updates.assignee) {
        const { error } = await supabase.rpc(
          'update_task_assignee_with_time_tracking' as any,
          {
            p_task_id: taskId,
            p_new_assignee: updates.assignee,
            p_other_updates: { ...updates, assignee: undefined }
          }
        );

        if (error) throw error;
      } else {
        // Atualização normal sem mudança de responsável
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;
      }

      // Buscar dados atualizados
      const { data: freshTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Log da atividade
      await logActivity('task', taskId, 'update', originalTask, freshTask);

      setTasks(currentTasks => 
        currentTasks.map(task => (task.id === taskId ? freshTask as Task : task))
      );
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message);
      setTasks(originalTasks);
      throw err;
    }
  }, [tasks, setTasks, setError, logActivity, user]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

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

      // Log da atividade
      await logActivity('task', taskId, 'delete', taskToDelete, null);

    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message);
      setTasks(originalTasks);
      throw err;
    }
  }, [tasks, setTasks, setError, logActivity, user]);

  const fixAllPositions = useCallback(async () => {
    try {
      console.log('[FIX POSITIONS] Starting manual position normalization...');
      
      // Buscar todas as colunas
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('id')
        .order('position');

      if (columnsError) throw columnsError;

      // Para cada coluna, normalizar posições
      for (const column of columns || []) {
        const columnTasks = tasks
          .filter(t => t.column_id === column.id)
          .sort((a, b) => a.position - b.position);

        // Atualizar posições sequenciais
        for (let i = 0; i < columnTasks.length; i++) {
          if (columnTasks[i].position !== i) {
            await supabase
              .from('tasks')
              .update({ position: i })
              .eq('id', columnTasks[i].id);
          }
        }
      }

      // Recarregar dados
      const { data: freshTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('column_id')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;
      
      if (freshTasks) {
        setTasks(freshTasks as Task[]);
      }
      
      console.log('[FIX POSITIONS] Manual position normalization completed');
    } catch (err: any) {
      console.error('Error fixing positions:', err);
      setError(err.message);
    }
  }, [tasks, setTasks, setError]);

  return {
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    fixAllPositions
  };
};
