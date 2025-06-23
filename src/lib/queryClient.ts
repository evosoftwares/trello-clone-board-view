import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - dados ficam fresh por 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: (failureCount, error: any) => {
        // Não retry em erros 4xx (cliente)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry até 2 vezes para outros erros
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Evita refetch desnecessário
      refetchOnMount: false, // Usa cache se ainda estiver fresh
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false, // Não retry mutations automaticamente
      onError: (error) => {
        console.error('[MUTATION ERROR]', error);
      },
    },
  },
});

// Cache keys padronizados para evitar duplicação
export const QUERY_KEYS = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  kanban: (projectId?: string | null) => ['kanban', projectId] as const,
  tasks: (projectId?: string | null) => ['tasks', projectId] as const,
  columns: ['columns'] as const,
  profiles: ['profiles'] as const,
  tags: ['tags'] as const,
  taskTags: ['taskTags'] as const,
  referenceData: ['referenceData'] as const,
  activityHistory: (filters?: any) => ['activityHistory', filters] as const,
} as const;

// Utility para invalidar queries relacionadas
export const invalidateRelatedQueries = async (
  queryClient: QueryClient,
  entityType: 'task' | 'project' | 'kanban',
  projectId?: string | null
) => {
  const invalidations = [];

  switch (entityType) {
    case 'task':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taskTags }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activityHistory() })
      );
      break;
    case 'project':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban() })
      );
      break;
    case 'kanban':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) })
      );
      break;
  }

  await Promise.all(invalidations);
};