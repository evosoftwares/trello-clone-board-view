
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/database';

export const useActivityHistory = (entityType?: string, entityId?: string) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const queryClient = useQueryClient();

  const fetchActivities = useCallback(async (limit = 100) => {
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []) as ActivityLog[];
  }, [entityType, entityId]);

  const { 
    data: activities = [], 
    isLoading: loading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['activity_log', entityType, entityId],
    queryFn: () => fetchActivities(),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
  });

  const fetchEntityHistory = useCallback(async (type: string, id: string, limit = 50) => {
    const { data, error } = await supabase.rpc('get_entity_history', {
      p_entity_type: type,
      p_entity_id: id,
      p_limit: limit
    });

    if (error) throw error;
    return (data || []) as ActivityLog[];
  }, []);

  // Configurar realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity-log-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'activity_log' }, 
        (payload) => {
          console.log('Activity log change:', payload);
          // Invalidar e refetch os dados
          queryClient.invalidateQueries({ queryKey: ['activity_log'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filtrar atividades localmente
  const filteredActivities = activities.filter(activity => {
    const typeMatch = filterType === 'all' || activity.entity_type === filterType;
    const actionMatch = filterAction === 'all' || activity.action_type === filterAction;
    return typeMatch && actionMatch;
  });

  return {
    activities: filteredActivities,
    loading,
    error: error?.message || null,
    fetchActivities: refetch,
    fetchEntityHistory,
    filterType,
    setFilterType,
    filterAction,
    setFilterAction,
  };
};
