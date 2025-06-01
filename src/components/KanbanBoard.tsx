import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TeamMember from './TeamMember';
import KanbanColumn from './KanbanColumn';
import { User, Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  assignee?: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const KanbanBoard = () => {
  const [teamMembers] = useState([
    { id: '1', name: 'Marcelo', taskCount: 0, avatar: '👨‍💻' },
    { id: '2', name: 'Babi', taskCount: 0, avatar: '👩‍💻' },
    { id: '3', name: 'Victor', taskCount: 0, avatar: '👨‍💼' },
    { id: '4', name: 'Gabriel', taskCount: 0, avatar: '👨‍🎨' },
  ]);

  const [columns, setColumns] = useState<Column[]>([
    { id: 'backlog', title: 'Backlog', tasks: [] },
    { id: 'trabalhando', title: 'Trabalhando', tasks: [] },
    { id: 'revisao', title: 'Revisão Devs', tasks: [] },
    { id: 'concluido', title: 'Concluído', tasks: [] },
  ]);

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = columns.find(col => col.id === source.droppableId);
    const finish = columns.find(col => col.id === destination.droppableId);

    if (!start || !finish) return;

    console.log(`Movendo tarefa ${draggableId} de ${source.droppableId} para ${destination.droppableId}`);

    if (start === finish) {
      const newTasks = Array.from(start.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      const newColumn = { ...start, tasks: newTasks };
      const newColumns = columns.map(col => col.id === newColumn.id ? newColumn : col);
      setColumns(newColumns);
      return;
    }

    const startTasks = Array.from(start.tasks);
    const [removed] = startTasks.splice(source.index, 1);
    const newStart = { ...start, tasks: startTasks };

    const finishTasks = Array.from(finish.tasks);
    finishTasks.splice(destination.index, 0, removed);
    const newFinish = { ...finish, tasks: finishTasks };

    const newColumns = columns.map(col => {
      if (col.id === newStart.id) return newStart;
      if (col.id === newFinish.id) return newFinish;
      return col;
    });

    setColumns(newColumns);
  };

  const addTask = (columnId: string, title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
    };

    console.log(`Adicionando nova tarefa: ${title} na coluna ${columnId}`);

    const newColumns = columns.map(col => 
      col.id === columnId 
        ? { ...col, tasks: [...col.tasks, newTask] }
        : col
    );

    setColumns(newColumns);
  };

  const handleTaskClick = (task: Task) => {
    console.log(`Tarefa selecionada: ${task.title} (ID: ${task.id})`);
    // Aqui você pode implementar a lógica para abrir detalhes da tarefa, editar, etc.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header com logo animado */}
        <div className="flex items-center mb-8 animate-slide-in-from-top">
          <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300 hover:shadow-xl animate-pulse-gentle">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center transform hover:rotate-180 transition-transform duration-500">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce-subtle"></div>
            </div>
            {/* Círculos orbitais */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-spin-slow opacity-50"></div>
            <div className="absolute inset-2 rounded-full border border-purple-300 animate-spin-slow-reverse opacity-30"></div>
          </div>
          <div className="ml-4 animate-slide-in-from-left">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Kanban Board
            </h1>
          </div>
        </div>

        {/* Seção da Equipe com animação escalonada */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8 transform hover:shadow-xl transition-all duration-300 animate-slide-in-from-bottom">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 animate-fade-in-delay-1">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Equipe
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMembers.map((member, index) => (
              <div 
                key={member.id} 
                className="animate-fade-in-scale"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <TeamMember member={member} />
              </div>
            ))}
          </div>
        </div>

        {/* Colunas do Kanban com animação fluida */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 transform hover:shadow-xl transition-all duration-300 animate-slide-in-from-bottom-delayed">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {columns.map((column, index) => (
                <div 
                  key={column.id} 
                  className="animate-slide-in-from-bottom"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <KanbanColumn 
                    column={column} 
                    onAddTask={addTask}
                    onTaskClick={handleTaskClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
