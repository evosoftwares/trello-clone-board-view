
import React from 'react';
import ActivityHistory from '@/components/ActivityHistory';

const ActivityHistoryPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Histórico Completo de Atividades</h1>
        <p className="text-gray-600 mt-2">
          Visualize todas as modificações realizadas no sistema, incluindo criação, edição e exclusão de tarefas, projetos e membros da equipe.
        </p>
      </div>
      
      <ActivityHistory />
    </div>
  );
};

export default ActivityHistoryPage;
