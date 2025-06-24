
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TaskComment, Profile } from '@/types/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useTaskComments');

export const useTaskComments = (taskId: string) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Buscar perfis dos usuários que comentaram
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);
      }

      setComments(commentsData || []);
    } catch (error: any) {
      logger.error('Error fetching comments', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar comentários',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [taskId, toast]);

  const addComment = useCallback(async (content: string, mentionedUsers: string[] = []) => {
    if (!user || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: content.trim(),
          mentioned_users: mentionedUsers
        })
        .select()
        .single();

      if (error) throw error;

      // Buscar perfil do usuário que comentou
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData && !profiles.find(p => p.id === user.id)) {
        setProfiles(prev => [...prev, profileData]);
      }

      setComments(prev => [...prev, data]);

      toast({
        title: 'Sucesso',
        description: 'Comentário adicionado!',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });
    } catch (error: any) {
      logger.error('Error adding comment', error);
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar comentário',
        variant: 'destructive'
      });
    }
  }, [user, taskId, profiles, toast]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));

      toast({
        title: 'Sucesso',
        description: 'Comentário removido!',
        className: 'bg-red-50 border-red-200 text-red-900'
      });
    } catch (error: any) {
      logger.error('Error deleting comment', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover comentário',
        variant: 'destructive'
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    profiles,
    loading,
    addComment,
    deleteComment,
    refreshComments: fetchComments
  };
};
