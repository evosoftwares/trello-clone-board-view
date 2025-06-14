
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/database';

export const useActivityHistory = (entityType?: string, entityId?: string) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (limit = 50) => {
    setLoading(true);
    setError(null);
    
    try {
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
      
      setActivities((data || []) as ActivityLog[]);
    } catch (err: any) {
      console.error('Error fetching activity history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const fetchEntityHistory = useCallback(async (type: string, id: string, limit = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_entity_history', {
        p_entity_type: type,
        p_entity_id: id,
        p_limit: limit
      });

      if (error) throw error;
      
      setActivities((data || []) as ActivityLog[]);
    } catch (err: any) {
      console.error('Error fetching entity history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Configurar realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity-log-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'activity_log' }, 
        (payload) => {
          console.log('Activity log change:', payload);
          fetchActivities(); // Recarregar dados quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    fetchActivities,
    fetchEntityHistory
  };
};
