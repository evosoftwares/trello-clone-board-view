import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useActivityLogger = () => {
  const { user, profile } = useAuth();

  const logActivity = useCallback(async (
    entityType: 'task' | 'project' | 'team_member' | 'column' | 'tag' | 'task_comment',
    entityId: string,
    actionType: 'create' | 'update' | 'delete' | 'move',
    oldData?: any,
    newData?: any,
    context?: any
  ) => {
    try {
      const activityData = {
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        old_data: oldData || null,
        new_data: newData || null,
        changed_by: profile?.name || user?.email || 'Sistema',
        user_id: user?.id || null,
        context: context || null,
      };

      console.log('[ACTIVITY LOG] Logging activity:', activityData);

      const { error } = await supabase
        .from('activity_logs')
        .insert([activityData]);

      if (error) {
        console.error('[ACTIVITY LOG] Error logging activity:', error);
      } else {
        console.log('[ACTIVITY LOG] Activity logged successfully');
      }
    } catch (error) {
      console.error('[ACTIVITY LOG] Exception logging activity:', error);
    }
  }, [user, profile]);

  const logProjectActivity = useCallback(async (
    projectId: string,
    actionType: 'create' | 'update' | 'delete',
    oldData?: any,
    newData?: any
  ) => {
    await logActivity('project', projectId, actionType, oldData, newData);
  }, [logActivity]);

  const logTaskActivity = useCallback(async (
    taskId: string,
    actionType: 'create' | 'update' | 'delete' | 'move',
    oldData?: any,
    newData?: any,
    context?: any
  ) => {
    await logActivity('task', taskId, actionType, oldData, newData, context);
  }, [logActivity]);

  const logTeamMemberActivity = useCallback(async (
    memberId: string,
    actionType: 'create' | 'update' | 'delete',
    oldData?: any,
    newData?: any
  ) => {
    await logActivity('team_member', memberId, actionType, oldData, newData);
  }, [logActivity]);

  const logTagActivity = useCallback(async (
    tagId: string,
    actionType: 'create' | 'update' | 'delete',
    oldData?: any,
    newData?: any
  ) => {
    await logActivity('tag', tagId, actionType, oldData, newData);
  }, [logActivity]);

  return {
    logActivity,
    logProjectActivity,
    logTaskActivity,
    logTeamMemberActivity,
    logTagActivity,
  };
};
