
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TAG');

export const useTagMutations = () => {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();

  const createTag = useCallback(async (name: string, color: string) => {
    logger.info('Starting tag creation', { name, color, user: user?.id });
    
    if (!user) {
      logger.error('No user found');
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      logger.debug('Calling Supabase insert');
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), color })
        .select()
        .single();

      if (error) {
        logger.error('Supabase error', error);
        throw error;
      }

      logger.info('Tag creation success', data);

      try {
        await logActivity('tag', data.id, 'create', null, data);
        logger.debug('Activity logged successfully');
      } catch (logError) {
        logger.warn('Failed to log activity', logError);
        // Continue execution even if logging fails
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta criada com sucesso!',
        className: 'bg-green-50 border-green-200 text-green-900'
      });

      return data;
    } catch (error: any) {
      logger.error('Tag creation error', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const updateTag = useCallback(async (tagId: string, name: string, color: string) => {
    logger.info('Starting tag update', { tagId, name, color, user: user?.id });
    
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Get old data for logging
      const { data: oldData } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      const { data, error } = await supabase
        .from('tags')
        .update({ name: name.trim(), color })
        .eq('id', tagId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Tag update success', data);

      try {
        await logActivity('tag', tagId, 'update', oldData, data);
      } catch (logError) {
        logger.warn('Failed to log activity', logError);
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta atualizada com sucesso!',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });

      return data;
    } catch (error: any) {
      logger.error('Tag update error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const deleteTag = useCallback(async (tagId: string) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Get old data for logging
      const { data: oldData } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      try {
        await logActivity('tag', tagId, 'delete', oldData, null);
      } catch (logError) {
        logger.warn('Failed to log activity', logError);
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta removida com sucesso!',
        className: 'bg-red-50 border-red-200 text-red-900'
      });
    } catch (error: any) {
      logger.error('Tag delete error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
    logger.info('Starting add tag to task', { taskId, tagId, user: user?.id });
    
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_tags')
        .insert({ task_id: taskId, tag_id: tagId })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate key error
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          logger.debug('Tag already assigned, ignoring');
          return;
        }
        throw error;
      }

      logger.info('Add tag to task success', data);
      return data;
    } catch (error: any) {
      logger.error('Add tag to task error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar etiqueta à tarefa',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast]);

  const removeTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId);

      if (error) throw error;
    } catch (error: any) {
      logger.error('Remove tag from task error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta da tarefa',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast]);

  return {
    createTag,
    updateTag,
    deleteTag,
    addTagToTask,
    removeTagFromTask
  };
};
