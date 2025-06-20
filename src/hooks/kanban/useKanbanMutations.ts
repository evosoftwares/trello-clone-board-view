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

const NO_PROJECT_VALUE = 'no-project-sentinel';

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

      //  2. Reorganizar coluna de destino
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

      // 3. Log da atividade apenas se houve mudança de coluna
      if (taskToMove.column_id !== newColumnId) {
        console.log('[MOVE TASK] Logging activity for column change');
        await logActivity(
          'task',
          taskId,
          'move',
          { 
            column_id: taskToMove.column_id, 
            position: taskToMove.position,
            title: taskToMove.title 
          },
          { 
            column_id: newColumnId, 
            position: newPosition,
            title: taskToMove.title 
          },
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

      // Handle project_id properly - convert sentinel value to null
      let validProjectId: string | null = null;
      if (projectId && projectId !== NO_PROJECT_VALUE && projectId.trim() !== '' && projectId !== 'undefined' && projectId !== 'null') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(projectId)) {
          validProjectId = projectId;
        } else {
          console.warn('[CREATE TASK] Invalid project_id format:', projectId);
        }
      }

      const taskData: any = {
        title: title.trim(),
        column_id: columnId,
        position: maxPosition + 1,
        function_points: 1,
        complexity: 'medium',
        status_image_filenames: ['tarefas.svg'],
        description: null,
        assignee: null,
        estimated_hours: null,
        project_id: validProjectId
      };

      console.log('[CREATE TASK] Task data to insert:', taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('[CREATE TASK] Database error:', error);
        throw error;
      }

      console.log('[CREATE TASK] Task created successfully:', data);

      // Atualizar state local imediatamente
      setTasks(currentTasks => [...currentTasks, data as Task]);

      // Log da atividade
      try {
        await logActivity('task', data.id, 'create', null, data, { 
          project_id: data.project_id,
          column_id: columnId 
        });
        console.log('[CREATE TASK] Activity logged successfully');
      } catch (logError) {
        console.warn('[CREATE TASK] Failed to log activity:', logError);
        // Não falhar a criação da tarefa por causa do log
      }

    } catch (err: any) {
      console.error('[CREATE TASK] Error creating task:', err);
      setError(`Erro ao criar tarefa: ${err.message}`);
    }
  }, [tasks, setTasks, setError, logActivity, user]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    const originalTasks = tasks;
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (!originalTask) {
      setError('Tarefa não encontrada');
      return;
    }

    console.log('[UPDATE TASK] Original task:', originalTask);
    console.log('[UPDATE TASK] Updates to apply:', updates);

    // Clean and validate updates
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // Special validation for project_id
        if (key === 'project_id') {
          if (value === null || value === NO_PROJECT_VALUE || value === '' || value === 'undefined' || value === 'null') {
            cleanUpdates[key] = null;
          } else if (typeof value === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(value)) {
              cleanUpdates[key] = value;
            } else {
              console.warn('[UPDATE TASK] Invalid project_id format:', value);
              cleanUpdates[key] = null;
            }
          }
        } else {
          cleanUpdates[key] = value;
        }
      }
    });

    console.log('[UPDATE TASK] Clean updates:', cleanUpdates);
    
    // Aplicar mudanças otimisticamente
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...cleanUpdates } : task
    );
    setTasks(updatedTasks);

    try {
      // Usar função do banco para garantir timestamp preciso quando houver mudança de responsável
      if (cleanUpdates.assignee !== undefined && originalTask?.assignee !== cleanUpdates.assignee) {
        const { error } = await supabase.rpc(
          'update_task_assignee_with_time_tracking' as any,
          {
            p_task_id: taskId,
            p_new_assignee: cleanUpdates.assignee,
            p_other_updates: { ...cleanUpdates, assignee: undefined }
          }
        );

        if (error) {
          console.error('[UPDATE TASK] RPC error:', error);
          throw error;
        }
      } else {
        // Atualização normal sem mudança de responsável
        const { error } = await supabase
          .from('tasks')
          .update(cleanUpdates)
          .eq('id', taskId);

        if (error) {
          console.error('[UPDATE TASK] Update error:', error);
          throw error;
        }
      }

      // Buscar dados atualizados
      const { data: freshTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        console.error('[UPDATE TASK] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[UPDATE TASK] Fresh task data:', freshTask);

      // Atualizar state com dados frescos do banco
      setTasks(currentTasks => 
        currentTasks.map(task => (task.id === taskId ? freshTask as Task : task))
      );

      // Log da atividade
      try {
        await logActivity('task', taskId, 'update', originalTask, freshTask, {
          project_id: originalTask.project_id,
          column_id: originalTask.column_id
        });
        console.log('[UPDATE TASK] Activity logged successfully');
      } catch (logError) {
        console.warn('[UPDATE TASK] Failed to log activity:', logError);
        // Não falhar a atualização por causa do log
      }

    } catch (err: any) {
      console.error('[UPDATE TASK] Error updating task:', err);
      setError(`Erro ao atualizar tarefa: ${err.message}`);
      setTasks(originalTasks); // Reverter mudanças otimistas
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
    
    if (!taskToDelete) {
      setError('Tarefa não encontrada');
      return;
    }
    
    console.log('[DELETE TASK] Deleting task:', taskToDelete);
    
    // Aplicar mudança otimisticamente
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('[DELETE TASK] Delete error:', error);
        throw error;
      }

      console.log('[DELETE TASK] Task deleted successfully');

      // Log da atividade
      try {
        await logActivity('task', taskId, 'delete', taskToDelete, null, {
          project_id: taskToDelete.project_id,
          column_id: taskToDelete.column_id
        });
        console.log('[DELETE TASK] Activity logged successfully');
      } catch (logError) {
        console.warn('[DELETE TASK] Failed to log activity:', logError);
        // Não falhar a exclusão por causa do log
      }

    } catch (err: any) {
      console.error('[DELETE TASK] Error deleting task:', err);
      setError(`Erro ao deletar tarefa: ${err.message}`);
      setTasks(originalTasks); // Reverter mudanças otimistas
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
