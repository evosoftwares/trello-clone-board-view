
import { useEffect, useCallback, useState } from 'react';
import { Task } from '@/types/database';
import { useKanbanDataFetch } from './kanban/useKanbanDataFetch';
import { useKanbanMutations } from './kanban/useKanbanMutations';

export const useKanbanData = (selectedProjectId?: string | null) => {
  const {
    columns,
    tasks,
    profiles, // Mudou de teamMembers para profiles
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setProfiles, // Mudou de setTeamMembers para setProfiles
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
    teamMembers: profiles, // Alias para manter compatibilidade
    profiles,
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
