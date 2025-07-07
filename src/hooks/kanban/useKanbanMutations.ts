import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/utils/logger';

const logger = createLogger('KANBAN');

interface UseKanbanMutationsProps {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setError: (error: string | null) => void;
}

const NO_PROJECT_VALUE = 'no-project-sentinel';

export const useKanbanMutations = ({ tasks, setTasks, setError }: UseKanbanMutationsProps) => {
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();
  
  // Função auxiliar para calcular novas posições baseado no índice real
  const calculateNewPositions = (
    allTasks: Task[],
    taskId: string,
    newColumnId: string,
    destinationIndex: number
  ) => {
    const taskToMove = allTasks.find(t => t.id === taskId);
    if (!taskToMove) {
      logger.error('Task not found for position calculation', taskId);
      return [];
    }

    const updates: Array<{ id: string; column_id: string; position: number }> = [];
    const oldColumnId = taskToMove.column_id;

    logger.debug('Task to move', {
      taskId,
      from: { columnId: oldColumnId, currentPosition: taskToMove.position },
      to: { columnId: newColumnId, destinationIndex }
    });

    if (oldColumnId === newColumnId) {
      // MOVIMENTO DENTRO DA MESMA COLUNA
      const columnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      logger.debug('Column tasks before reorder', 
        columnTasks.map(t => ({ id: t.id, position: t.position, title: t.title }))
      );

      // Remover a tarefa que está sendo movida da lista ordenada
      const tasksWithoutMoved = columnTasks.filter(t => t.id !== taskId);
      
      // Inserir a tarefa na nova posição (destinationIndex)
      const reorderedTasks = [...tasksWithoutMoved];
      const safeDestinationIndex = Math.min(Math.max(0, destinationIndex), reorderedTasks.length);
      reorderedTasks.splice(safeDestinationIndex, 0, taskToMove);

      logger.debug('Column tasks after reorder', 
        reorderedTasks.map((t, idx) => ({ id: t.id, newPosition: idx, title: t.title }))
      );

      // Atualizar posições para todas as tarefas que mudaram
      reorderedTasks.forEach((task, index) => {
        if (task.position !== index) {
          updates.push({
            id: task.id,
            column_id: newColumnId,
            position: index
          });
        }
      });

    } else {
      // MOVIMENTO ENTRE COLUNAS DIFERENTES
      
      // 1. Reorganizar coluna de origem (remover tarefa movida)
      const oldColumnTasks = allTasks
        .filter(t => t.column_id === oldColumnId && t.id !== taskId)
        .sort((a, b) => a.position - b.position);

      logger.debug('Old column tasks after removal', 
        oldColumnTasks.map(t => ({ id: t.id, position: t.position, title: t.title }))
      );

      oldColumnTasks.forEach((task, index) => {
        if (task.position !== index) {
          updates.push({
            id: task.id,
            column_id: oldColumnId,
            position: index
          });
        }
      });

      // 2. Reorganizar coluna de destino (inserir tarefa)
      const newColumnTasks = allTasks
        .filter(t => t.column_id === newColumnId)
        .sort((a, b) => a.position - b.position);

      logger.debug('New column tasks before insertion', 
        newColumnTasks.map(t => ({ id: t.id, position: t.position, title: t.title }))
      );

      // Inserir tarefa na posição desejada
      const safeDestinationIndex = Math.min(Math.max(0, destinationIndex), newColumnTasks.length);
      const reorderedNewColumnTasks = [...newColumnTasks];
      reorderedNewColumnTasks.splice(safeDestinationIndex, 0, taskToMove);

      logger.debug('New column tasks after insertion', 
        reorderedNewColumnTasks.map((t, idx) => ({ id: t.id, newPosition: idx, title: t.title }))
      );

      // Atualizar posições para todas as tarefas da coluna de destino
      reorderedNewColumnTasks.forEach((task, index) => {
        updates.push({
          id: task.id,
          column_id: newColumnId,
          position: index
        });
      });
    }

    logger.debug('Final updates', updates);
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

  const moveTask = useCallback(async (taskId: string, sourceColumnId: string, newColumnId: string, destinationIndex?: number) => {
    logger.info('Starting task move', { taskId, from: sourceColumnId, to: newColumnId, destinationIndex });

    // Validate inputs
    if (!taskId || !sourceColumnId || !newColumnId) {
      logger.error('Invalid move parameters', { taskId, sourceColumnId, newColumnId });
      setError('Parâmetros inválidos para mover tarefa');
      return;
    }

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) {
      logger.error('Task not found', taskId);
      setError('Tarefa não encontrada');
      return;
    }

    // Validate task is in expected source column
    if (taskToMove.column_id !== sourceColumnId) {
      logger.warn('Task column mismatch', { 
        taskId, 
        expected: sourceColumnId, 
        actual: taskToMove.column_id 
      });
    }

    // Usar destinationIndex se fornecido, senão última posição na coluna
    const columnTasks = tasks.filter(t => t.column_id === newColumnId);
    const newPosition = destinationIndex !== undefined ? destinationIndex : 
      columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.position), -1) + 1 : 0;

    logger.debug('Calculated position', { destinationIndex, newPosition });

    const updates = calculateNewPositions(tasks, taskId, newColumnId, newPosition);
    if (updates.length === 0) {
      logger.debug('No updates needed');
      return;
    }

    const originalTasks = tasks;

    // 1. Aplicar mudanças otimisticamente
    setTasks(currentTasks => applyLocalChanges(currentTasks, updates));

    try {
      // 2. Usar stored procedure através de query SQL direta (try with points system first, fallback to basic, then direct updates)
      let fallbackNeeded = false;
      
      try {
        const { error } = await supabase.rpc(
          'update_task_with_time_tracking_and_points' as any,
          {
            p_task_id: taskId,
            p_updates: updates,
            p_column_changed: taskToMove.column_id !== newColumnId
          }
        );
        
        if (error) {
          logger.warn('Points system function failed, trying basic function', error);
          fallbackNeeded = true;
        }
      } catch (pointsError) {
        logger.warn('Points system function not available, falling back to basic function', pointsError);
        fallbackNeeded = true;
      }
      
      if (fallbackNeeded) {
        try {
          const { error } = await supabase.rpc(
            'update_task_with_time_tracking',
            {
              p_task_id: taskId,
              p_updates: updates,
              p_column_changed: taskToMove.column_id !== newColumnId
            }
          );
          
          if (error) {
            logger.warn('Basic function failed, falling back to direct updates', error);
            // Fallback to direct database updates
            for (const update of updates) {
              const updateData: any = {
                column_id: update.column_id,
                position: update.position
              };
              
              // Add timestamp update if this is the moved task and column changed
              if (update.id === taskId && taskToMove.column_id !== newColumnId) {
                updateData.current_status_start_time = new Date().toISOString();
              }
              
              const { error: directError } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', update.id);
                
              if (directError) {
                throw directError;
              }
            }
          }
        } catch (basicError) {
          logger.error('Basic function failed, using direct updates', basicError);
          // Fallback to direct database updates
          for (const update of updates) {
            const updateData: any = {
              column_id: update.column_id,
              position: update.position
            };
            
            // Add timestamp update if this is the moved task and column changed
            if (update.id === taskId && taskToMove.column_id !== newColumnId) {
              updateData.current_status_start_time = new Date().toISOString();
            }
            
            const { error: directError } = await supabase
              .from('tasks')
              .update(updateData)
              .eq('id', update.id);
              
            if (directError) {
              throw directError;
            }
          }
        }
      }

      // 3. Log da atividade apenas se houve mudança de coluna
      if (taskToMove.column_id !== newColumnId) {
        logger.debug('Logging activity for column change');
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

      logger.info('Database sync completed successfully');

    } catch (err: any) {
      logger.error('Error syncing with database', err);
      
      // Revert optimistic changes on error
      setTasks(originalTasks);
      
      // Set user-friendly error message
      const errorMessage = err?.message || 'Erro desconhecido';
      if (errorMessage.includes('function') && errorMessage.includes('schema cache')) {
        setError('Erro de configuração do banco de dados. Tente novamente.');
      } else if (errorMessage.includes('permission')) {
        setError('Sem permissão para mover esta tarefa.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError(`Erro ao mover tarefa: ${errorMessage}`);
      }
    }
  }, [tasks, setTasks, setError, logActivity]);

  const createTask = useCallback(async (taskData: Partial<Task>, columnId: string) => {
    logger.info('Starting task creation', { taskData, columnId, user: !!user });
    
    if (!user) {
      logger.error('User not authenticated');
      setError('Usuário não autenticado');
      return;
    }

    try {
      const maxPosition = Math.max(
        ...tasks.filter(t => t.column_id === columnId).map(t => t.position),
        -1
      );

      const newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        title: taskData.title || 'Nova Tarefa',
        description: taskData.description || null,
        column_id: columnId,
        position: maxPosition + 1,
        assignee: taskData.assignee || null,
        function_points: taskData.function_points || 1,
        complexity: taskData.complexity || 'medium',
        project_id: taskData.project_id || null,
        status_image_filenames: ['tarefas.svg'],
        estimated_hours: null,
      };
      
      logger.debug('Task data to insert', newTaskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTaskData)
        .select()
        .single();

      if (error) {
        logger.error('Database error', error);
        throw error;
      }

      logger.info('Task created successfully', data);

      setTasks(currentTasks => [...currentTasks, data as Task]);

      await logActivity(
        'task',
        data.id,
        'create',
        null,
        { 
          title: data.title, 
          column_id: data.column_id,
          project_id: data.project_id 
        },
        { 
          project_id: data.project_id
        }
      );

      logger.debug('Activity logged');

    } catch (err: any) {
      logger.error('Error creating task', err);
      setError(`Erro ao criar tarefa: ${err.message}`);
    }
  }, [tasks, setTasks, setError, user, logActivity]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
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

    logger.debug('Original task', originalTask);
    logger.debug('Updates to apply', updates);

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
              // Cast to UUID explicitly for PostgreSQL
              cleanUpdates[key] = value;
            } else {
              logger.warn('Invalid project_id format, setting to null', value);
              cleanUpdates[key] = null;
            }
          } else {
            // Handle non-string values
            logger.warn('project_id is not a string, setting to null', value);
            cleanUpdates[key] = null;
          }
        } else {
          cleanUpdates[key] = value;
        }
      }
    });

    logger.debug('Clean updates', cleanUpdates);
    
    // Aplicar mudanças otimisticamente
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...cleanUpdates } : task
    );
    setTasks(updatedTasks);

    try {
      // Update direto incluindo timestamp quando houver mudança de responsável
      if (cleanUpdates.assignee !== undefined && originalTask?.assignee !== cleanUpdates.assignee) {
        const updateData = { 
          ...cleanUpdates, 
          current_status_start_time: new Date().toISOString() 
        };
        
        const { error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);

        if (error) {
          logger.error('[KANBAN] Update error', error);
          throw error;
        }
      } else {
        // Atualização normal sem mudança de responsável
        // Se project_id está sendo atualizado, usar cast explícito
        let updateQuery = supabase.from('tasks').update(cleanUpdates).eq('id', taskId);
        
        if ('project_id' in cleanUpdates) {
          // Remove project_id dos cleanUpdates e trata separadamente
          const { project_id, ...otherUpdates } = cleanUpdates;
          
          if (Object.keys(otherUpdates).length > 0) {
            // Fazer update dos outros campos primeiro
            const { error: otherError } = await supabase
              .from('tasks')
              .update(otherUpdates)
              .eq('id', taskId);
            
            if (otherError) {
              logger.error('Update error (other fields)', otherError);
              throw otherError;
            }
          }
          
          // Depois fazer update do project_id com cast explícito
          const projectIdUpdate = project_id === null ? null : `${project_id}::uuid`;
          const { error: projectError } = await supabase.rpc(
            'update_task_project_id',
            {
              task_id: taskId,
              new_project_id: project_id
            }
          ).then(async (result) => {
            // Fallback para query SQL direta se RPC não existir
            if (result.error && result.error.message?.includes('function')) {
              return supabase
                .from('tasks')
                .update({ project_id: project_id })
                .eq('id', taskId);
            }
            return result;
          });
          
          if (projectError) {
            logger.error('Project ID update error', projectError);
            throw projectError;
          }
        } else {
          const { error } = await updateQuery;
          if (error) {
            logger.error('Update error', error);
            throw error;
          }
        }
      }

      // Buscar dados atualizados
      const { data: freshTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        logger.error('Fetch error', fetchError);
        throw fetchError;
      }

      logger.debug('Fresh task data', freshTask);

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
        logger.debug('Activity logged successfully');
      } catch (logError) {
        logger.warn('Failed to log activity', logError);
        // Não falhar a atualização por causa do log
      }

    } catch (err: any) {
      logger.error('Error updating task', err);
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
    
    logger.info('Deleting task', taskToDelete);
    
    // Aplicar mudança otimisticamente
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        logger.error('Delete error', error);
        throw error;
      }

      logger.info('Task deleted successfully');

      // Log da atividade
      try {
        await logActivity('task', taskId, 'delete', taskToDelete, null, {
          project_id: taskToDelete.project_id,
          column_id: taskToDelete.column_id
        });
        logger.debug('Activity logged successfully');
      } catch (logError) {
        logger.warn('Failed to log activity', logError);
        // Não falhar a exclusão por causa do log
      }

    } catch (err: any) {
      logger.error('Error deleting task', err);
      setError(`Erro ao deletar tarefa: ${err.message}`);
      setTasks(originalTasks); // Reverter mudanças otimistas
      throw err;
    }
  }, [tasks, setTasks, setError, logActivity, user]);

  const fixAllPositions = useCallback(async () => {
    try {
      logger.info('Starting manual position normalization');
      
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
      
      logger.info('Manual position normalization completed');
    } catch (err: any) {
      logger.error('Error fixing positions', err);
      setError(err.message);
    }
  }, [tasks, setTasks, setError]);

  const diagnoseTaskUpdate = useCallback(async (taskId: string) => {
    logger.info('Running task update diagnostics', { taskId });
    
    try {
      // 1. Verificar se a tarefa existe
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        logger.error('DIAGNOSTICS: Task not found in local state', taskId);
        return { success: false, error: 'Task not found in local state' };
      }

      // 2. Verificar se a tarefa existe no banco
      const { data: dbTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        logger.error('DIAGNOSTICS: Task not found in database', fetchError);
        return { success: false, error: 'Task not found in database', details: fetchError };
      }

      // 3. Testar as funções RPC
      const diagnostics: any = {
        task_exists: true,
        rpc_functions: {}
      };

      // Testar update_task_with_time_tracking_and_points
      try {
        const { error } = await supabase.rpc('update_task_with_time_tracking_and_points' as any, {
          p_task_id: taskId,
          p_updates: [{ id: taskId, column_id: task.column_id, position: task.position }],
          p_column_changed: false
        });
        diagnostics.rpc_functions.points_system = error ? { available: false, error } : { available: true };
      } catch (err) {
        diagnostics.rpc_functions.points_system = { available: false, error: err };
      }

      // Testar update_task_with_time_tracking
      try {
        const { error } = await supabase.rpc('update_task_with_time_tracking', {
          p_task_id: taskId,
          p_updates: [{ id: taskId, column_id: task.column_id, position: task.position }],
          p_column_changed: false
        });
        diagnostics.rpc_functions.basic_tracking = error ? { available: false, error } : { available: true };
      } catch (err) {
        diagnostics.rpc_functions.basic_tracking = { available: false, error: err };
      }

      // Testar update_task_assignee_with_time_tracking
      try {
        const { error } = await supabase.rpc('update_task_assignee_with_time_tracking' as any, {
          p_task_id: taskId,
          p_new_assignee: task.assignee,
          p_other_updates: {}
        });
        diagnostics.rpc_functions.assignee_tracking = error ? { available: false, error } : { available: true };
      } catch (err) {
        diagnostics.rpc_functions.assignee_tracking = { available: false, error: err };
      }

      // 4. Testar update direto
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', taskId);
        diagnostics.direct_update = error ? { available: false, error } : { available: true };
      } catch (err) {
        diagnostics.direct_update = { available: false, error: err };
      }

      logger.info('DIAGNOSTICS Results:', diagnostics);
      return { success: true, diagnostics };

    } catch (err: any) {
      logger.error('DIAGNOSTICS: Unexpected error', err);
      return { success: false, error: 'Unexpected diagnostic error', details: err };
    }
  }, [tasks]);

  return {
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    fixAllPositions,
    diagnoseTaskUpdate
  };
};
