
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
      
      // Verificar se perfil já existe com retry
      let existingProfile = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log(`[PROFILE CREATION] Checking if profile exists (attempt ${retryCount + 1})...`);
          const { data: profileData, error: checkError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('[PROFILE CREATION] Error checking existing profile:', checkError);
            throw checkError;
          }

          existingProfile = profileData;
          break;
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw err;
          }
          console.log(`[PROFILE CREATION] Retry ${retryCount} in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
        
        // Se o erro for de duplicata, tentar buscar o perfil novamente
        if (insertError.code === '23505') {
          console.log('[PROFILE CREATION] Duplicate key error, fetching existing profile...');
          const { data: existingAfterError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (existingAfterError) {
            return existingAfterError as Profile;
          }
        }
        
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
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
      } else if (err.message?.includes('duplicate key') || err.code === '23505') {
        errorMessage = 'Perfil já existe para este usuário.';
        // Não mostrar toast para erro de duplicata
        return null;
      } else if (err.message?.includes('network')) {
        errorMessage = 'Erro de rede. Verifique sua conexão.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Só mostrar toast se não for erro de duplicata
      if (!err.message?.includes('duplicate') && err.code !== '23505') {
        toast({
          title: "Erro ao criar perfil",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
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
