
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useUserSetup');

interface User {
  name: string;
  email: string;
  password: string;
  role: string;
}

export const useUserSetup = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const processUser = async (user: User) => {
    logger.info(`Processing user: ${user.name}`);

    // 1. Verificar se o perfil já existe
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (profileError) {
      logger.error(`Error checking profile for ${user.name}`, profileError);
      throw new Error(`Erro ao verificar perfil - ${profileError.message}`);
    }

    if (existingProfile) {
      logger.info(`${user.name} already has profile`);
      return `${user.name} - Perfil já existe`;
    }

    // 2. Tentar criar usuário na autenticação
    logger.info(`Creating auth user for ${user.name}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          name: user.name,
          role: user.role
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        logger.info(`${user.name} already exists in auth`);
        
        // Tentar fazer login para pegar o ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });

        if (signInError) {
          logger.error(`Error signing in for ${user.name}`, signInError);
          throw new Error(signInError.message);
        }

        if (signInData.user) {
          // Criar perfil para usuário existente
          logger.info(`Creating profile for ${user.name}`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: signInData.user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              is_active: true
            });

          if (insertError) {
            logger.error(`Error creating profile for ${user.name}`, insertError);
            throw new Error(`Erro ao criar perfil - ${insertError.message}`);
          }

          logger.info(`Profile created for ${user.name}`);
          
          // Deslogar após criar perfil
          await supabase.auth.signOut();
          return `${user.name} - Perfil criado`;
        }
      } else {
        logger.error(`Signup error for ${user.name}`, signUpError);
        throw new Error(signUpError.message);
      }
    } else if (signUpData.user) {
      logger.info(`User ${user.name} created in auth`);
      
      // Criar perfil imediatamente
      logger.info(`Creating profile for new user ${user.name}`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: true
        });

      if (insertError) {
        logger.error(`Error creating profile for ${user.name}`, insertError);
        throw new Error(`Erro ao criar perfil - ${insertError.message}`);
      }

      logger.info(`${user.name} created successfully`);
      return `${user.name} - Criado com sucesso`;
    }

    return null;
  };

  const checkAndCreateUsers = async (users: User[]) => {
    setLoading(true);
    setErrors([]);
    setResults([]);
    const resultsList: string[] = [];
    const errorList: string[] = [];

    logger.info('Starting user verification/creation...');

    try {
      // Primeiro, testar conectividade básica
      logger.info('Testing connectivity...');
      const { data: connectivityTest, error: connectivityError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (connectivityError) {
        logger.error('Connectivity error', connectivityError);
        errorList.push(`Erro de conectividade: ${connectivityError.message}`);
        setErrors(errorList);
        setLoading(false);
        return;
      }

      logger.info('Connectivity OK, processing users...');

      for (const user of users) {
        try {
          const result = await processUser(user);
          if (result) {
            resultsList.push(result);
          }

          // Pausa entre criações
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (err: any) {
          logger.error(`Unexpected error for ${user.name}`, err);
          errorList.push(`${user.name}: ${err.message || 'Erro inesperado'}`);
        }
      }

    } catch (err: any) {
      logger.error('General error', err);
      errorList.push(`Erro geral: ${err.message || 'Erro inesperado'}`);
    }

    setResults(resultsList);
    setErrors(errorList);
    setLoading(false);
    
    if (resultsList.length > 0) {
      toast({
        title: "Processamento concluído!",
        description: `${resultsList.length} usuário(s) processado(s).`
      });
    }

    if (errorList.length > 0) {
      toast({
        title: "Alguns erros ocorreram",
        description: `${errorList.length} erro(s) encontrado(s).`,
        variant: "destructive"
      });
    }
  };

  return {
    loading,
    results,
    errors,
    checkAndCreateUsers
  };
};
