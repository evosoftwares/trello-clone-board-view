
import { useEffect, useCallback, useState } from 'react';
import { Task } from '@/types/database';
import { useKanbanDataFetch } from './kanban/useKanbanDataFetch';
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

  // error state control simplificada
  const [internalError, setInternalError] = useState<string | null>(null);

  const { moveTask, createTask, updateTask, deleteTask } = useKanbanMutations({
    tasks,
    setTasks,
    setError: setInternalError
  });

  // Fetch inicial e após refresh/manual
  const refreshData = useCallback(() => {
    fetchAllData(selectedProjectId);
  }, [selectedProjectId, fetchAllData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    columns,
    tasks,
    teamMembers,
    tags,
    taskTags,
    loading,
    error: error || internalError,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refreshData
  };
};
