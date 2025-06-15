
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConnectivityTest from './ConnectivityTest';
import UsersList from './UsersList';
import ProcessingResults from './ProcessingResults';
import LoginCredentials from './LoginCredentials';
import { useUserSetup } from '@/hooks/useUserSetup';

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
  const { loading, results, errors, checkAndCreateUsers } = useUserSetup();

  const handleCheckAndCreateUsers = () => {
    checkAndCreateUsers(initialUsers);
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
          <UsersList users={initialUsers} />

          <Button 
            onClick={handleCheckAndCreateUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processando...' : 'Verificar/Criar Usuários'}
          </Button>

          <ProcessingResults results={results} errors={errors} />

          <LoginCredentials />
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialUsersSetup;
