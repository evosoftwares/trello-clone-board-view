
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';

export const useManualProfileCreation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const creatingRef = useRef<Set<string>>(new Set());

  const createProfileIfNotExists = async (userId: string, name: string, email?: string, role = 'developer'): Promise<Profile | null> => {
    // Evitar chamadas duplicadas para o mesmo usuário
    if (creatingRef.current.has(userId)) {
      console.log('[PROFILE CREATION] Already creating profile for user:', userId);
      return null;
    }

    try {
      setLoading(true);
      creatingRef.current.add(userId);
      console.log('[PROFILE CREATION] Starting for user:', { userId, name, email, role });
      
      // Verificar se perfil já existe
      console.log('[PROFILE CREATION] Checking if profile exists...');
      const { data: profileData, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[PROFILE CREATION] Error checking existing profile:', checkError);
        throw checkError;
      }

      if (profileData) {
        console.log('[PROFILE CREATION] Profile already exists:', profileData);
        return profileData as Profile;
      }

      // Criar novo perfil
      console.log('[PROFILE CREATION] Creating new profile...');
      const newProfileData = {
        id: userId,
        name: name,
        email: email,
        role: role,
        is_active: true
      };

      console.log('[PROFILE CREATION] Profile data to insert:', newProfileData);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfileData)
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
            .maybeSingle();
          
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
        // Não mostrar toast para erro de duplicata - é esperado
        return null;
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
      creatingRef.current.delete(userId);
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
