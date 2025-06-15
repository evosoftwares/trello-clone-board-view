
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';

export const useManualProfileCreation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createProfileIfNotExists = async (userId: string, name: string, email?: string, role = 'developer'): Promise<Profile | null> => {
    try {
      setLoading(true);
      console.log('[PROFILE CREATION] Starting for user:', { userId, name, email, role });
      
      // Verificar se perfil já existe
      console.log('[PROFILE CREATION] Checking if profile exists...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('[PROFILE CREATION] Error checking existing profile:', checkError);
        throw new Error(`Erro ao verificar perfil: ${checkError.message}`);
      }

      if (existingProfile) {
        console.log('[PROFILE CREATION] Profile already exists:', existingProfile);
        return existingProfile as Profile;
      }

      // Criar novo perfil
      console.log('[PROFILE CREATION] Creating new profile...');
      const profileData = {
        id: userId,
        name: name,
        email: email,
        role: role,
        is_active: true
      };

      console.log('[PROFILE CREATION] Profile data to insert:', profileData);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('[PROFILE CREATION] Insert error:', insertError);
        throw new Error(`Erro ao criar perfil: ${insertError.message}`);
      }

      console.log('[PROFILE CREATION] Profile created successfully:', newProfile);
      
      toast({
        title: "Perfil criado",
        description: `Perfil de ${name} criado com sucesso!`,
      });

      return newProfile as Profile;

    } catch (err: any) {
      console.error('[PROFILE CREATION] Error creating profile:', err);
      
      // Mensagens de erro mais claras
      let errorMessage = 'Erro desconhecido ao criar perfil';
      
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
      } else if (err.message?.includes('duplicate key')) {
        errorMessage = 'Perfil já existe para este usuário.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Erro de rede. Verifique sua conexão.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Erro ao criar perfil",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  const ensureProfileExists = async (user: any): Promise<Profile | null> => {
    if (!user) {
      console.log('[PROFILE CREATION] No user provided');
      return null;
    }

    console.log('[PROFILE CREATION] Ensuring profile exists for user:', user.id);
    
    try {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      return await createProfileIfNotExists(user.id, name, user.email);
    } catch (err: any) {
      console.error('[PROFILE CREATION] Error in ensureProfileExists:', err);
      return null;
    }
  };

  return {
    createProfileIfNotExists,
    ensureProfileExists,
    loading
  };
};
