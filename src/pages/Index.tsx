
import React from 'react';
import Header from '@/components/layout/Header';
import KanbanBoard from '@/components/KanbanBoard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-6">
        <KanbanBoard />
      </main>
    </div>
  );
};

export default Index;
