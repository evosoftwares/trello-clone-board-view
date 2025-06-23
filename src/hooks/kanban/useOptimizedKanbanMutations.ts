import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/database';
import { QUERY_KEYS, invalidateRelatedQueries } from '@/lib/queryClient';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';

interface BatchTaskUpdate {
  id: string;
  column_id: string;
  position: number;
}

interface TaskMoveParams {
  taskId: string;
  sourceColumnId: string;
  newColumnId: string;
  newPosition?: number;
  currentTasks: Task[];
}

interface TaskCreateParams {
  taskData: Partial<Task>;
  columnId: string;
  projectId?: string | null;
}

interface TaskUpdateParams {
  taskId: string;
  updates: Partial<Omit<Task, 'id'>>;
  projectId?: string | null;
}

interface TaskDeleteParams {
  taskId: string;
  projectId?: string | null;
}

const calculateOptimisticUpdates = (
  allTasks: Task[],
  taskId: string,
  newColumnId: string,
  newPosition: number
): BatchTaskUpdate[] => {
  const taskToMove = allTasks.find(t => t.id === taskId);
  if (!taskToMove) return [];

  const updates: BatchTaskUpdate[] = [];
  const oldColumnId = taskToMove.column_id;

  if (oldColumnId === newColumnId) {
    // Movement within same column
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
    // Movement between different columns
    
    // 1. Reorganize source column
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

    // 2. Reorganize destination column
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

export const useOptimizedKanbanMutations = (selectedProjectId?: string | null) => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();

  // Optimistic update helper
  const applyOptimisticTaskUpdates = (updates: BatchTaskUpdate[]) => {
    const kanbanKey = QUERY_KEYS.kanban(selectedProjectId);
    
    queryClient.setQueryData(kanbanKey, (oldData: any) => {
      if (!oldData?.tasks) return oldData;
      
      const updatedTasks = oldData.tasks.map((task: Task) => {
        const update = updates.find(u => u.id === task.id);
        return update ? { ...task, ...update } : task;
      });

      return { ...oldData, tasks: updatedTasks };
    });
  };

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, sourceColumnId, newColumnId, newPosition = 0, currentTasks }: TaskMoveParams) => {
      const taskToMove = currentTasks.find(t => t.id === taskId);
      if (!taskToMove) throw new Error('Task not found');

      const calculatedPosition = newPosition ?? Math.max(
        ...currentTasks.filter(t => t.column_id === newColumnId).map(t => t.position),
        -1
      ) + 1;

      const updates = calculateOptimisticUpdates(currentTasks, taskId, newColumnId, calculatedPosition);
      
      if (updates.length === 0) return null;

      // Apply optimistic updates
      applyOptimisticTaskUpdates(updates);

      // Execute database update
      const { error } = await supabase.rpc(
        'update_task_with_time_tracking' as any,
        {
          p_task_id: taskId,
          p_updates: updates,
          p_column_changed: taskToMove.column_id !== newColumnId
        }
      );

      if (error) throw error;

      // Log activity if column changed
      if (taskToMove.column_id !== newColumnId) {
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
            position: calculatedPosition,
            title: taskToMove.title 
          },
          { 
            from_column: taskToMove.column_id,
            to_column: newColumnId,
            project_id: taskToMove.project_id
          }
        );
      }

      return { taskId, updates };
    },
    onError: (error, variables) => {
      console.error('[MOVE TASK] Error:', error);
      // Revert optimistic updates by refetching
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(selectedProjectId) });
    },
    onSettled: () => {
      // Invalidate related queries
      invalidateRelatedQueries(queryClient, 'task', selectedProjectId);
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async ({ taskData, columnId, projectId }: TaskCreateParams) => {
      if (!user) throw new Error('User not authenticated');

      const kanbanData = queryClient.getQueryData(QUERY_KEYS.kanban(selectedProjectId)) as any;
      const currentTasks = kanbanData?.tasks || [];
      
      const maxPosition = Math.max(
        ...currentTasks.filter((t: Task) => t.column_id === columnId).map((t: Task) => t.position),
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
        project_id: projectId || null,
        status_image_filenames: ['tarefas.svg'],
        estimated_hours: null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(newTaskData)
        .select()
        .single();

      if (error) throw error;

      // Log activity
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

      return data as Task;
    },
    onSuccess: (newTask) => {
      // Update cache optimistically
      const kanbanKey = QUERY_KEYS.kanban(selectedProjectId);
      queryClient.setQueryData(kanbanKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          tasks: [...(oldData.tasks || []), newTask]
        };
      });
    },
    onError: (error) => {
      console.error('[CREATE TASK] Error:', error);
    },
    onSettled: () => {
      invalidateRelatedQueries(queryClient, 'task', selectedProjectId);
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates, projectId }: TaskUpdateParams) => {
      if (!user) throw new Error('User not authenticated');

      // Clean updates (same logic as original)
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'project_id') {
            if (value === null || value === 'no-project-sentinel' || value === '' || value === 'undefined' || value === 'null') {
              cleanUpdates[key] = null;
            } else if (typeof value === 'string') {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(value)) {
                cleanUpdates[key] = value;
              } else {
                cleanUpdates[key] = null;
              }
            }
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      // Get current task for activity logging
      const kanbanData = queryClient.getQueryData(QUERY_KEYS.kanban(selectedProjectId)) as any;
      const originalTask = kanbanData?.tasks?.find((t: Task) => t.id === taskId);
      
      if (!originalTask) throw new Error('Task not found');

      // Database update
      if (cleanUpdates.assignee !== undefined && originalTask?.assignee !== cleanUpdates.assignee) {
        const { error } = await supabase.rpc(
          'update_task_assignee_with_time_tracking' as any,
          {
            p_task_id: taskId,
            p_new_assignee: cleanUpdates.assignee,
            p_other_updates: { ...cleanUpdates, assignee: undefined }
          }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .update(cleanUpdates)
          .eq('id', taskId);
        if (error) throw error;
      }

      // Get fresh data
      const { data: freshTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Log activity
      await logActivity('task', taskId, 'update', originalTask, freshTask, {
        project_id: originalTask.project_id,
        column_id: originalTask.column_id
      });

      return freshTask as Task;
    },
    onSuccess: (updatedTask) => {
      // Update cache
      const kanbanKey = QUERY_KEYS.kanban(selectedProjectId);
      queryClient.setQueryData(kanbanKey, (oldData: any) => {
        if (!oldData?.tasks) return oldData;
        return {
          ...oldData,
          tasks: oldData.tasks.map((task: Task) => 
            task.id === updatedTask.id ? updatedTask : task
          )
        };
      });
    },
    onError: (error) => {
      console.error('[UPDATE TASK] Error:', error);
    },
    onSettled: () => {
      invalidateRelatedQueries(queryClient, 'task', selectedProjectId);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId, projectId }: TaskDeleteParams) => {
      if (!user) throw new Error('User not authenticated');

      // Get task for logging
      const kanbanData = queryClient.getQueryData(QUERY_KEYS.kanban(selectedProjectId)) as any;
      const taskToDelete = kanbanData?.tasks?.find((t: Task) => t.id === taskId);
      
      if (!taskToDelete) throw new Error('Task not found');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      await logActivity('task', taskId, 'delete', taskToDelete, null, {
        project_id: taskToDelete.project_id,
        column_id: taskToDelete.column_id
      });

      return { taskId, deletedTask: taskToDelete };
    },
    onSuccess: ({ taskId }) => {
      // Remove from cache
      const kanbanKey = QUERY_KEYS.kanban(selectedProjectId);
      queryClient.setQueryData(kanbanKey, (oldData: any) => {
        if (!oldData?.tasks) return oldData;
        return {
          ...oldData,
          tasks: oldData.tasks.filter((task: Task) => task.id !== taskId)
        };
      });
    },
    onError: (error) => {
      console.error('[DELETE TASK] Error:', error);
    },
    onSettled: () => {
      invalidateRelatedQueries(queryClient, 'task', selectedProjectId);
    }
  });

  return {
    moveTask: moveTaskMutation.mutate,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isMoving: moveTaskMutation.isPending,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
};