
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useActivityLogger');

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
      logger.info('Creating activity log', {
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
        logger.error('Error creating activity log', error);
      } else {
        logger.info('Activity log created successfully');
      }
    } catch (err) {
      logger.error('Exception in activity logger', err);
    }
  };

  return { logActivity };
};
