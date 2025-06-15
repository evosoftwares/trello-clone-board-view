
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
  const { toast } = useToast();
  const { createProfileIfNotExists } = useManualProfileCreation();

  const createInitialUsers = async () => {
    setLoading(true);
    const created: string[] = [];

    for (const user of initialUsers) {
      try {
        // 1. Tentar criar usuário na autenticação
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              name: user.name,
              role: user.role
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            console.log(`Usuário ${user.name} já existe`);
            
            // Verificar se perfil existe, se não criar
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', user.email)
              .maybeSingle();

            if (!existingProfile) {
              // Usuário existe na auth mas não tem perfil - criar perfil
              // Primeiro precisamos pegar o ID do usuário
              const { data: userData } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password
              });

              if (userData.user) {
                await createProfileIfNotExists(userData.user.id, user.name, user.email, user.role);
                await supabase.auth.signOut(); // Deslogar após criar perfil
              }
            }
            
            created.push(`${user.name} (já existia)`);
          } else {
            throw error;
          }
        } else if (data.user) {
          // 2. Criar perfil imediatamente após signup
          await createProfileIfNotExists(data.user.id, user.name, user.email, user.role);
          created.push(user.name);
          console.log(`Usuário ${user.name} criado com sucesso`);
        }
      } catch (err: any) {
        console.error(`Erro ao criar usuário ${user.name}:`, err);
        toast({
          title: "Erro",
          description: `Falha ao criar usuário ${user.name}: ${err.message}`,
          variant: "destructive"
        });
      }
    }

    setCreatedUsers(created);
    setLoading(false);
    
    if (created.length > 0) {
      toast({
        title: "Usuários configurados!",
        description: `${created.length} usuários foram processados com sucesso.`
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

        <div className="text-xs text-muted-foreground">
          <p>Credenciais temporárias:</p>
          <p>• Email: nome@kanban.dev</p>
          <p>• Senha: nome123</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InitialUsersSetup;
