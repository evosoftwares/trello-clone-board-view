
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useManualProfileCreation } from '@/hooks/useManualProfileCreation';

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
  const [createdUsers, setCreatedUsers] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const { createProfileIfNotExists } = useManualProfileCreation();

  const createInitialUsers = async () => {
    setLoading(true);
    setErrors([]);
    const created: string[] = [];
    const errorList: string[] = [];

    console.log('[INITIAL USERS] Starting user creation process...');

    for (const user of initialUsers) {
      try {
        console.log(`[INITIAL USERS] Processing user: ${user.name}`);

        // 1. Tentar criar usuário na autenticação
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
            console.log(`[INITIAL USERS] User ${user.name} already exists in auth`);
            
            // Usuário já existe - tentar fazer login para pegar o ID
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: user.password
            });

            if (signInError) {
              console.error(`[INITIAL USERS] Could not sign in existing user ${user.name}:`, signInError);
              errorList.push(`${user.name}: ${signInError.message}`);
              continue;
            }

            if (signInData.user) {
              // Verificar se perfil existe
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', signInData.user.id)
                .maybeSingle();

              if (!existingProfile) {
                // Criar perfil para usuário existente
                await createProfileIfNotExists(signInData.user.id, user.name, user.email, user.role);
              }
              
              // Deslogar após verificação
              await supabase.auth.signOut();
              created.push(`${user.name} (já existia)`);
            }
          } else {
            console.error(`[INITIAL USERS] Signup error for ${user.name}:`, signUpError);
            errorList.push(`${user.name}: ${signUpError.message}`);
          }
        } else if (signUpData.user) {
          console.log(`[INITIAL USERS] User ${user.name} created in auth`);
          
          // 2. Criar perfil imediatamente após signup
          const profile = await createProfileIfNotExists(signUpData.user.id, user.name, user.email, user.role);
          
          if (profile) {
            created.push(user.name);
            console.log(`[INITIAL USERS] User ${user.name} created successfully with profile`);
          } else {
            errorList.push(`${user.name}: Falha ao criar perfil`);
          }
        }

        // Pequena pausa entre criações
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err: any) {
        console.error(`[INITIAL USERS] Unexpected error for ${user.name}:`, err);
        errorList.push(`${user.name}: ${err.message || 'Erro inesperado'}`);
      }
    }

    setCreatedUsers(created);
    setErrors(errorList);
    setLoading(false);
    
    if (created.length > 0) {
      toast({
        title: "Usuários processados!",
        description: `${created.length} usuário(s) processado(s) com sucesso.`
      });
    }

    if (errorList.length > 0) {
      toast({
        title: "Alguns erros ocorreram",
        description: `${errorList.length} erro(s) encontrado(s). Verifique os detalhes abaixo.`,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Configuração Inicial</CardTitle>
        <p className="text-sm text-muted-foreground">
          Criar os 4 usuários iniciais do sistema Kanban
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-medium mb-2">Usuários a serem criados:</p>
          <ul className="space-y-1 text-muted-foreground">
            {initialUsers.map((user) => (
              <li key={user.email}>• {user.name} ({user.role})</li>
            ))}
          </ul>
        </div>

        <Button 
          onClick={createInitialUsers} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Criando usuários...' : 'Criar Usuários Iniciais'}
        </Button>

        {createdUsers.length > 0 && (
          <div className="text-sm">
            <p className="font-medium text-green-600 mb-2">Usuários processados:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {createdUsers.map((user, index) => (
                <li key={index}>✓ {user}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className="text-sm">
            <p className="font-medium text-red-600 mb-2">Erros encontrados:</p>
            <ul className="space-y-1 text-sm text-red-500">
              {errors.map((error, index) => (
                <li key={index}>✗ {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Credenciais:</p>
          <p>• Email: nome@kanban.dev</p>
          <p>• Senha: nome123</p>
          <p className="mt-2 text-amber-600">
            ⚠️ Confirme os usuários no Supabase Dashboard se necessário
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InitialUsersSetup;
