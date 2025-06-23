import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { QUERY_KEYS } from '@/lib/queryClient';

interface InvalidationRule {
  trigger: string;
  invalidate: string[];
  condition?: (data?: any) => boolean;
}

const INVALIDATION_RULES: InvalidationRule[] = [
  // Task mutations affect kanban and activity data
  {
    trigger: 'task:create',
    invalidate: ['kanban', 'activityHistory'],
  },
  {
    trigger: 'task:update',
    invalidate: ['kanban', 'activityHistory'],
    condition: (data) => data?.significantChange === true
  },
  {
    trigger: 'task:move',
    invalidate: ['kanban', 'activityHistory'],
  },
  {
    trigger: 'task:delete',
    invalidate: ['kanban', 'activityHistory'],
  },
  
  // Project mutations affect projects and kanban data
  {
    trigger: 'project:create',
    invalidate: ['projects'],
  },
  {
    trigger: 'project:update',
    invalidate: ['projects', 'kanban'],
  },
  {
    trigger: 'project:delete',
    invalidate: ['projects', 'kanban'],
  },
  
  // Profile changes affect team data
  {
    trigger: 'profile:update',
    invalidate: ['profiles', 'kanban'],
  },
  
  // Tag changes affect task data
  {
    trigger: 'tag:update',
    invalidate: ['tags', 'taskTags', 'kanban'],
  },
];

export const useIntelligentCacheInvalidation = () => {
  const queryClient = useQueryClient();
  const invalidationHistoryRef = useRef<{ [key: string]: number }>({});

  const invalidateByRule = useCallback(async (
    trigger: string, 
    projectId?: string | null,
    data?: any
  ) => {
    const now = Date.now();
    const rules = INVALIDATION_RULES.filter(rule => rule.trigger === trigger);
    
    if (rules.length === 0) {
      console.warn(`[INTELLIGENT CACHE] No invalidation rules found for trigger: ${trigger}`);
      return;
    }

    console.log(`[INTELLIGENT CACHE] Processing ${rules.length} rules for trigger: ${trigger}`);

    for (const rule of rules) {
      // Check condition if present
      if (rule.condition && !rule.condition(data)) {
        console.log(`[INTELLIGENT CACHE] Skipping rule due to condition: ${rule.trigger}`);
        continue;
      }

      // Prevent duplicate invalidations within short time frame
      const ruleKey = `${rule.trigger}:${rule.invalidate.join(',')}:${projectId || 'global'}`;
      const lastInvalidation = invalidationHistoryRef.current[ruleKey];
      
      if (lastInvalidation && (now - lastInvalidation) < 1000) { // 1 second cooldown
        console.log(`[INTELLIGENT CACHE] Skipping duplicate invalidation: ${ruleKey}`);
        continue;
      }

      invalidationHistoryRef.current[ruleKey] = now;

      // Execute invalidations
      const promises = rule.invalidate.map(cacheType => {
        switch (cacheType) {
          case 'kanban':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.kanban(projectId) 
            });
          case 'projects':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.projects 
            });
          case 'profiles':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.profiles 
            });
          case 'tags':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.tags 
            });
          case 'taskTags':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.taskTags 
            });
          case 'activityHistory':
            return queryClient.invalidateQueries({ 
              queryKey: QUERY_KEYS.activityHistory() 
            });
          default:
            console.warn(`[INTELLIGENT CACHE] Unknown cache type: ${cacheType}`);
            return Promise.resolve();
        }
      });

      try {
        await Promise.allSettled(promises);
        console.log(`[INTELLIGENT CACHE] Successfully invalidated caches for: ${rule.invalidate.join(', ')}`);
      } catch (error) {
        console.error(`[INTELLIGENT CACHE] Error invalidating caches:`, error);
      }
    }

    // Clean up old invalidation history (older than 1 hour)
    const cutoff = now - (60 * 60 * 1000);
    Object.keys(invalidationHistoryRef.current).forEach(key => {
      if (invalidationHistoryRef.current[key] < cutoff) {
        delete invalidationHistoryRef.current[key];
      }
    });
  }, [queryClient]);

  const invalidateAll = useCallback(async () => {
    console.log('[INTELLIGENT CACHE] Invalidating all caches');
    await queryClient.invalidateQueries();
    invalidationHistoryRef.current = {};
  }, [queryClient]);

  const getInvalidationStats = useCallback(() => {
    const now = Date.now();
    const recentInvalidations = Object.entries(invalidationHistoryRef.current)
      .filter(([_, timestamp]) => (now - timestamp) < 300000) // Last 5 minutes
      .length;

    return {
      totalTrackedInvalidations: Object.keys(invalidationHistoryRef.current).length,
      recentInvalidations,
      availableRules: INVALIDATION_RULES.length
    };
  }, []);

  const preloadRelatedData = useCallback(async (
    trigger: string,
    projectId?: string | null
  ) => {
    // Preload data that might be needed after an operation
    const preloadMap: { [key: string]: string[] } = {
      'task:create': ['kanban'],
      'task:update': ['kanban'],
      'project:switch': ['kanban', 'tasks']
    };

    const toPreload = preloadMap[trigger];
    if (!toPreload) return;

    console.log(`[INTELLIGENT CACHE] Preloading data for trigger: ${trigger}`);

    const promises = toPreload.map(cacheType => {
      switch (cacheType) {
        case 'kanban':
          return queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.kanban(projectId),
          });
        case 'tasks':
          return queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.tasks(projectId),
          });
        default:
          return Promise.resolve();
      }
    });

    try {
      await Promise.allSettled(promises);
      console.log(`[INTELLIGENT CACHE] Preloaded: ${toPreload.join(', ')}`);
    } catch (error) {
      console.error('[INTELLIGENT CACHE] Preload error:', error);
    }
  }, [queryClient]);

  return {
    invalidateByRule,
    invalidateAll,
    getInvalidationStats,
    preloadRelatedData
  };
};