import { useBatchKanbanData } from './kanban/useBatchKanbanData';
import { useOptimizedKanbanMutations } from './kanban/useOptimizedKanbanMutations';

export const useOptimizedKanbanData = (selectedProjectId?: string | null) => {
  // Use batch data fetching
  const {
    data,
    isLoading: loading,
    error,
    refetch: refreshData
  } = useBatchKanbanData(selectedProjectId);

  // Use optimized mutations
  const mutations = useOptimizedKanbanMutations(selectedProjectId);

  // Return data with fallbacks
  const columns = data?.columns || [];
  const tasks = data?.tasks || [];
  const profiles = data?.profiles || [];
  const tags = data?.tags || [];
  const taskTags = data?.taskTags || [];

  return {
    // Data
    columns,
    tasks,
    profiles,
    teamMembers: profiles, // Alias for compatibility
    tags,
    taskTags,
    
    // States
    loading,
    error: error?.message || null,
    
    // Actions
    refreshData,
    ...mutations
  };
};