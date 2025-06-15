
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    console.log(`[SETUP] Processando ${user.name}...`);

    // 1. Verificar se o perfil já existe
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (profileError) {
      console.error(`[SETUP] Erro ao verificar perfil de ${user.name}:`, profileError);
      throw new Error(`Erro ao verificar perfil - ${profileError.message}`);
    }

    if (existingProfile) {
      console.log(`[SETUP] ${user.name} já tem perfil`);
      return `${user.name} - Perfil já existe`;
    }

    // 2. Tentar criar usuário na autenticação
    console.log(`[SETUP] Criando usuário de autenticação para ${user.name}...`);
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
        console.log(`[SETUP] ${user.name} já existe na autenticação`);
        
        // Tentar fazer login para pegar o ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });

        if (signInError) {
          console.error(`[SETUP] Erro ao fazer login para ${user.name}:`, signInError);
          throw new Error(signInError.message);
        }

        if (signInData.user) {
          // Criar perfil para usuário existente
          console.log(`[SETUP] Criando perfil para ${user.name}...`);
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
            console.error(`[SETUP] Erro ao criar perfil para ${user.name}:`, insertError);
            throw new Error(`Erro ao criar perfil - ${insertError.message}`);
          }

          console.log(`[SETUP] Perfil criado para ${user.name}`);
          
          // Deslogar após criar perfil
          await supabase.auth.signOut();
          return `${user.name} - Perfil criado`;
        }
      } else {
        console.error(`[SETUP] Erro de signup para ${user.name}:`, signUpError);
        throw new Error(signUpError.message);
      }
    } else if (signUpData.user) {
      console.log(`[SETUP] Usuário ${user.name} criado na autenticação`);
      
      // Criar perfil imediatamente
      console.log(`[SETUP] Criando perfil para novo usuário ${user.name}...`);
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
        console.error(`[SETUP] Erro ao criar perfil para ${user.name}:`, insertError);
        throw new Error(`Erro ao criar perfil - ${insertError.message}`);
      }

      console.log(`[SETUP] ${user.name} criado com sucesso`);
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

    console.log('[SETUP] Iniciando verificação/criação de usuários...');

    try {
      // Primeiro, testar conectividade básica
      console.log('[SETUP] Testando conectividade...');
      const { data: connectivityTest, error: connectivityError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (connectivityError) {
        console.error('[SETUP] Erro de conectividade:', connectivityError);
        errorList.push(`Erro de conectividade: ${connectivityError.message}`);
        setErrors(errorList);
        setLoading(false);
        return;
      }

      console.log('[SETUP] Conectividade OK, processando usuários...');

      for (const user of users) {
        try {
          const result = await processUser(user);
          if (result) {
            resultsList.push(result);
          }

          // Pausa entre criações
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (err: any) {
          console.error(`[SETUP] Erro inesperado para ${user.name}:`, err);
          errorList.push(`${user.name}: ${err.message || 'Erro inesperado'}`);
        }
      }

    } catch (err: any) {
      console.error('[SETUP] Erro geral:', err);
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
