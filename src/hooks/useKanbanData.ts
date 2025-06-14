
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

  const [internalError, setInternalError] = useState<string | null>(null);

  const { moveTask, createTask, updateTask, deleteTask, fixAllPositions } = useKanbanMutations({
    tasks,
    setTasks,
    setError: setInternalError
  });

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
    fixAllPositions,
    refreshData
  };
};
