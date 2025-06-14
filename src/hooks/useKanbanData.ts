import { useEffect, useCallback, useRef } from 'react';
import { Task } from '@/types/database';
import { useKanbanDataFetch } from './kanban/useKanbanDataFetch';
import { useKanbanRealtime } from './kanban/useKanbanRealtime';
import { useKanbanMutations } from './kanban/useKanbanMutations';

export const useKanbanData = (selectedProjectId?: string | null) => {
  const {
    columns,
    tasks,
    teamMembers,
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setTeamMembers,
    setTags,
    setTaskTags
  } = useKanbanDataFetch();

  const setError = useCallback((newError: string | null) => {
    // Error is managed by the fetch hook, but we need to expose it for mutations
  }, []);

  const { moveTask, createTask, updateTask, deleteTask } = useKanbanMutations({
    tasks,
    setTasks,
    setError
  });

  // Stable references for realtime callbacks
  const handleTaskInsert = useCallback((newTask: Task) => {
    setTasks(currentTasks => {
      if (currentTasks.some(t => t.id === newTask.id)) return currentTasks;
      return [...currentTasks, newTask];
    });
  }, [setTasks]);

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTasks(currentTasks => {
      if (selectedProjectId && updatedTask.project_id !== selectedProjectId) {
        return currentTasks.filter(task => task.id !== updatedTask.id);
      }
      const taskExists = currentTasks.some(task => task.id === updatedTask.id);
      if (taskExists) {
        return currentTasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
      } else if (!selectedProjectId || updatedTask.project_id === selectedProjectId) {
        return [...currentTasks, updatedTask];
      }
      return currentTasks;
    });
  }, [selectedProjectId, setTasks]);

  const handleTaskDelete = useCallback((taskId: string) => {
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
  }, [setTasks]);

  const handleDataChange = useCallback(() => {
    fetchAllData(selectedProjectId);
  }, [fetchAllData, selectedProjectId]);

  // Set up realtime with stable callbacks
  useKanbanRealtime({
    selectedProjectId,
    onTaskInsert: handleTaskInsert,
    onTaskUpdate: handleTaskUpdate,
    onTaskDelete: handleTaskDelete,
    onDataChange: handleDataChange
  });

  // Initial data fetch
  useEffect(() => {
    console.log("[KANBAN DATA] Initial fetch for project:", selectedProjectId);
    fetchAllData(selectedProjectId);
  }, [selectedProjectId, fetchAllData]);

  return {
    columns,
    tasks,
    teamMembers,
    tags,
    taskTags,
    loading,
    error,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refreshData: () => fetchAllData(selectedProjectId)
  };
};
