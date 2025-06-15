
import React from 'react';

interface User {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface UsersListProps {
  users: User[];
}

const UsersList: React.FC<UsersListProps> = ({ users }) => {
  return (
    <div className="text-sm">
      <p className="font-medium mb-2">Usuários:</p>
      <ul className="space-y-1 text-muted-foreground">
        {users.map((user) => (
          <li key={user.email}>• {user.name} ({user.role})</li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
