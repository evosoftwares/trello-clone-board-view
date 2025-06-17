
import React from 'react';
import Header from '@/components/layout/Header';
import KanbanBoard from '@/components/KanbanBoard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main className="w-full p-3 sm:p-4 lg:p-6">
        <KanbanBoard />
      </main>
    </div>
  );
};

export default Index;
