
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = async (
    entityType: 'task' | 'project' | 'team_member' | 'column' | 'tag',
    entityId: string,
    actionType: 'create' | 'update' | 'delete' | 'move',
    oldData?: any,
    newData?: any,
    context?: any
  ) => {
    if (!user) return;

    try {
      console.log('[ACTIVITY LOGGER] Creating log:', {
        entityType,
        entityId,
        actionType,
        userId: user.id,
        userEmail: user.email
      });

      const { error } = await supabase.from('activity_log').insert({
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        old_data: oldData,
        new_data: newData,
        user_id: user.id,
        changed_by: user.email || user.name || 'Usuario',
        context: context
      });

      if (error) {
        console.error('[ACTIVITY LOGGER] Error:', error);
      } else {
        console.log('[ACTIVITY LOGGER] Log created successfully');
      }
    } catch (err) {
      console.error('[ACTIVITY LOGGER] Exception:', err);
    }
  };

  return { logActivity };
};
