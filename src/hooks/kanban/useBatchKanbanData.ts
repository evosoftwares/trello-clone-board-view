import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryClient';
import { KanbanColumn, Task, Profile, Tag, TaskTag } from '@/types/database';

interface BatchKanbanData {
  columns: KanbanColumn[];
  tasks: Task[];
  profiles: Profile[];
  tags: Tag[];
  taskTags: TaskTag[];
}

const fetchBatchKanbanData = async (selectedProjectId?: string | null): Promise<BatchKanbanData> => {
  console.log('[BATCH FETCH] Starting batch data fetch for project:', selectedProjectId);
  
  // Execute todas as queries em paralelo usando Promise.all
  const [
    columnsResult,
    tasksResult,
    profilesResult,
    tagsResult,
    taskTagsResult
  ] = await Promise.all([
    supabase
      .from('kanban_columns')
      .select('*')
      .order('position'),
    
    selectedProjectId 
      ? supabase
          .from('tasks')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('position')
      : supabase
          .from('tasks')
          .select('*')
          .order('position'),
    
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    
    supabase
      .from('tags')
      .select('*')
      .order('name'),
    
    supabase
      .from('task_tags')
      .select('*')
  ]);

  // Verificar erros
  const errors = [
    columnsResult.error,
    tasksResult.error,
    profilesResult.error,
    tagsResult.error,
    taskTagsResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error('[BATCH FETCH] Errors found:', errors);
    throw new Error(`Batch fetch failed: ${errors[0]?.message}`);
  }

  // Converter tasks para o formato correto
  const convertedTasks = (tasksResult.data || []).map(task => ({
    ...task,
    function_points: task.function_points || 0,
    complexity: task.complexity || 'medium',
    status_image_filenames: task.status_image_filenames || []
  }));

  console.log('[BATCH FETCH] Data loaded successfully:', {
    columns: columnsResult.data?.length,
    tasks: convertedTasks.length,
    profiles: profilesResult.data?.length,
    tags: tagsResult.data?.length,
    taskTags: taskTagsResult.data?.length
  });

  return {
    columns: columnsResult.data || [],
    tasks: convertedTasks,
    profiles: profilesResult.data || [],
    tags: tagsResult.data || [],
    taskTags: taskTagsResult.data || []
  };
};

export const useBatchKanbanData = (selectedProjectId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.kanban(selectedProjectId),
    queryFn: () => fetchBatchKanbanData(selectedProjectId),
    staleTime: 30 * 1000, // 30 seconds para dados do kanban
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Sempre refetch ao montar (dados críticos)
    // Só refetch se o projectId mudou
    enabled: true,
  });
};