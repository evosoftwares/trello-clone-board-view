
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
      await supabase.from('activity_log').insert({
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        old_data: oldData,
        new_data: newData,
        user_id: user.id,
        changed_by: user.email || 'Usuario',
        context: context
      });
    } catch (err) {
      console.warn('Error logging activity:', err);
    }
  };

  return { logActivity };
};
