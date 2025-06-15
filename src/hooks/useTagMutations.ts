
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useAuth } from '@/contexts/AuthContext';

export const useTagMutations = () => {
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { user } = useAuth();

  const createTag = useCallback(async (name: string, color: string) => {
    console.log('[TAG CREATION] Starting with:', { name, color, user: user?.id });
    
    if (!user) {
      console.error('[TAG CREATION] No user found');
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      console.log('[TAG CREATION] Calling Supabase insert...');
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), color })
        .select()
        .single();

      if (error) {
        console.error('[TAG CREATION] Supabase error:', error);
        throw error;
      }

      console.log('[TAG CREATION] Success:', data);

      try {
        await logActivity('tag', data.id, 'create', null, data);
        console.log('[TAG CREATION] Activity logged successfully');
      } catch (logError) {
        console.warn('[TAG CREATION] Failed to log activity:', logError);
        // Continue execution even if logging fails
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta criada com sucesso!',
        className: 'bg-green-50 border-green-200 text-green-900'
      });

      return data;
    } catch (error: any) {
      console.error('[TAG CREATION] Error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const updateTag = useCallback(async (tagId: string, name: string, color: string) => {
    console.log('[TAG UPDATE] Starting with:', { tagId, name, color, user: user?.id });
    
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

      console.log('[TAG UPDATE] Success:', data);

      try {
        await logActivity('tag', tagId, 'update', oldData, data);
      } catch (logError) {
        console.warn('[TAG UPDATE] Failed to log activity:', logError);
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta atualizada com sucesso!',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });

      return data;
    } catch (error: any) {
      console.error('[TAG UPDATE] Error:', error);
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
        console.warn('[TAG DELETE] Failed to log activity:', logError);
      }

      toast({
        title: 'Sucesso',
        description: 'Etiqueta removida com sucesso!',
        className: 'bg-red-50 border-red-200 text-red-900'
      });
    } catch (error: any) {
      console.error('[TAG DELETE] Error:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
    console.log('[ADD TAG TO TASK] Starting with:', { taskId, tagId, user: user?.id });
    
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
          console.log('[ADD TAG TO TASK] Tag already assigned, ignoring');
          return;
        }
        throw error;
      }

      console.log('[ADD TAG TO TASK] Success:', data);
      return data;
    } catch (error: any) {
      console.error('[ADD TAG TO TASK] Error:', error);
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
      console.error('[REMOVE TAG FROM TASK] Error:', error);
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
