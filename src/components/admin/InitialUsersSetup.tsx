
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ConnectivityTest from './ConnectivityTest';

const initialUsers = [
  {
    name: 'Gabriel',
    email: 'gabriel@kanban.dev',
    password: 'gabriel123',
    role: 'admin'
  },
  {
    name: 'Babi',
    email: 'babi@kanban.dev', 
    password: 'babi123',
    role: 'designer'
  },
  {
    name: 'Victor',
    email: 'victor@kanban.dev',
    password: 'victor123', 
    role: 'developer'
  },
  {
    name: 'Marcelo',
    email: 'marcelo@kanban.dev',
    password: 'marcelo123',
    role: 'manager'
  }
];

const InitialUsersSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const checkAndCreateUsers = async () => {
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

      for (const user of initialUsers) {
        try {
          console.log(`[SETUP] Processando ${user.name}...`);

          // 1. Verificar se o perfil já existe
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (profileError) {
            console.error(`[SETUP] Erro ao verificar perfil de ${user.name}:`, profileError);
            errorList.push(`${user.name}: Erro ao verificar perfil - ${profileError.message}`);
            continue;
          }

          if (existingProfile) {
            console.log(`[SETUP] ${user.name} já tem perfil`);
            resultsList.push(`${user.name} - Perfil já existe`);
            continue;
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
                errorList.push(`${user.name}: ${signInError.message}`);
                continue;
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
                  errorList.push(`${user.name}: Erro ao criar perfil - ${insertError.message}`);
                } else {
                  console.log(`[SETUP] Perfil criado para ${user.name}`);
                  resultsList.push(`${user.name} - Perfil criado`);
                }

                // Deslogar após criar perfil
                await supabase.auth.signOut();
              }
            } else {
              console.error(`[SETUP] Erro de signup para ${user.name}:`, signUpError);
              errorList.push(`${user.name}: ${signUpError.message}`);
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
              errorList.push(`${user.name}: Erro ao criar perfil - ${insertError.message}`);
            } else {
              console.log(`[SETUP] ${user.name} criado com sucesso`);
              resultsList.push(`${user.name} - Criado com sucesso`);
            }
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

  return (
    <div className="space-y-6">
      <ConnectivityTest />
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Configuração de Usuários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Verificar e criar os usuários do sistema
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="font-medium mb-2">Usuários:</p>
            <ul className="space-y-1 text-muted-foreground">
              {initialUsers.map((user) => (
                <li key={user.email}>• {user.name} ({user.role})</li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={checkAndCreateUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processando...' : 'Verificar/Criar Usuários'}
          </Button>

          {results.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-green-600 mb-2">Resultados:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {results.map((result, index) => (
                  <li key={index}>✓ {result}</li>
                ))}
              </ul>
            </div>
          )}

          {errors.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-red-600 mb-2">Erros:</p>
              <ul className="space-y-1 text-sm text-red-500">
                {errors.map((error, index) => (
                  <li key={index}>✗ {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Credenciais de login:</p>
            <p>• Email: nome@kanban.dev</p>
            <p>• Senha: nome123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialUsersSetup;
