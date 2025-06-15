
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useManualProfileCreation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createProfileIfNotExists = async (userId: string, name: string, email?: string, role = 'developer') => {
    try {
      setLoading(true);
      
      // Verificar se perfil já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists for user:', userId);
        return existingProfile;
      }

      // Criar novo perfil
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: name,
          email: email,
          role: role,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Profile created successfully:', newProfile);
      return newProfile;

    } catch (err: any) {
      console.error('Error creating profile:', err);
      toast({
        title: "Erro ao criar perfil",
        description: err.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (user: any) => {
    if (!user) return null;

    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
    return await createProfileIfNotExists(user.id, name, user.email);
  };

  return {
    createProfileIfNotExists,
    ensureProfileExists,
    loading
  };
};
