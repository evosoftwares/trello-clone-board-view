
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

    const newColumns = columns.map(col => 
      col.id === columnId 
        ? { ...col, tasks: [...col.tasks, newTask] }
        : col
    );

    setColumns(newColumns);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with blue circle logo */}
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamMembers.map((member) => (
              <TeamMember key={member.id} member={member} />
            ))}
          </div>
        </div>

        {/* Kanban Columns */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {columns.map((column) => (
                <KanbanColumn 
                  key={column.id} 
                  column={column} 
                  onAddTask={addTask}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
