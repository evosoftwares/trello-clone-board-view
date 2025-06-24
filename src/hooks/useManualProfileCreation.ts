
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PROFILE CREATION');

export const useManualProfileCreation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const creatingRef = useRef<Set<string>>(new Set());

  const createProfileIfNotExists = useCallback(async (userId: string, name: string, email?: string, role = 'developer'): Promise<Profile | null> => {
    // Evitar chamadas duplicadas para o mesmo usuário
    if (creatingRef.current.has(userId)) {
      logger.debug('Already creating profile for user', userId);
      return null;
    }

    try {
      setLoading(true);
      creatingRef.current.add(userId);
      logger.info('Starting profile creation for user', { userId, name, email, role });
      
      // Verificar se perfil já existe
      logger.debug('Checking if profile exists');
      const { data: profileData, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error('Error checking existing profile', checkError);
        throw checkError;
      }

      if (profileData) {
        logger.debug('Profile already exists', profileData);
        return profileData as Profile;
      }

      // Criar novo perfil
      logger.debug('Creating new profile');
      const newProfileData = {
        id: userId,
        name: name,
        email: email,
        role: role,
        is_active: true
      };

      logger.debug('Profile data to insert', newProfileData);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfileData)
        .select()
        .single();

      if (insertError) {
        logger.error('Insert error', insertError);
        
        // Se o erro for de duplicata, tentar buscar o perfil novamente
        if (insertError.code === '23505') {
          logger.debug('Duplicate key error, fetching existing profile');
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

      logger.info('Profile created successfully', newProfile);
      
      toast({
        title: "Perfil criado",
        description: `Perfil de ${name} criado com sucesso!`,
      });

      return newProfile as Profile;

    } catch (err: any) {
      logger.error('Error creating profile', err);
      
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
  }, [toast]);

  const ensureProfileExists = useCallback(async (user: any): Promise<Profile | null> => {
    if (!user) {
      logger.debug('No user provided');
      return null;
    }

    logger.debug('Ensuring profile exists for user', user.id);
    
    try {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      return await createProfileIfNotExists(user.id, name, user.email);
    } catch (err: any) {
      logger.error('Error in ensureProfileExists', err);
      return null;
    }
  }, [createProfileIfNotExists]);

  return {
    createProfileIfNotExists,
    ensureProfileExists,
    loading
  };
};
