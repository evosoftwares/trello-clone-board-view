
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
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name, color })
        .select()
        .single();

      if (error) throw error;

      await logActivity('tag', data.id, 'create', null, data);

      toast({
        title: 'Sucesso',
        description: 'Etiqueta criada com sucesso!',
        className: 'bg-green-50 border-green-200 text-green-900'
      });

      return data;
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const updateTag = useCallback(async (tagId: string, name: string, color: string) => {
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
        .update({ name, color })
        .eq('id', tagId)
        .select()
        .single();

      if (error) throw error;

      await logActivity('tag', tagId, 'update', oldData, data);

      toast({
        title: 'Sucesso',
        description: 'Etiqueta atualizada com sucesso!',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });

      return data;
    } catch (error: any) {
      console.error('Error updating tag:', error);
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

      await logActivity('tag', tagId, 'delete', oldData, null);

      toast({
        title: 'Sucesso',
        description: 'Etiqueta removida com sucesso!',
        className: 'bg-red-50 border-red-200 text-red-900'
      });
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, logActivity]);

  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
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

      if (error) throw error;

      return data;
    } catch (error: any) {
      // Ignore duplicate key errors (tag already assigned)
      if (!error.message?.includes('duplicate key')) {
        console.error('Error adding tag to task:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao adicionar etiqueta à tarefa',
          variant: 'destructive'
        });
        throw error;
      }
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
      console.error('Error removing tag from task:', error);
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
