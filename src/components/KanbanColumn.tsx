import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus, Sparkles } from 'lucide-react';

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

interface KanbanColumnProps {
  column: Column;
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick?: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onAddTask, onTaskClick }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(column.id, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskTitle('');
    }
  };

  const getColumnColor = () => {
    switch (column.id) {
      case 'backlog': return 'from-gray-100 to-gray-200 border-gray-300';
      case 'trabalhando': return 'from-blue-100 to-blue-200 border-blue-300';
      case 'revisao': return 'from-yellow-100 to-yellow-200 border-yellow-300';
      case 'concluido': return 'from-green-100 to-green-200 border-green-300';
      default: return 'from-gray-100 to-gray-200 border-gray-300';
    }
  };

  return (
    <div className={`group relative bg-gradient-to-br ${getColumnColor()} rounded-xl p-4 h-fit min-h-[400px] border-2 transform hover:scale-102 transition-all duration-300 hover:shadow-lg animate-slide-in-from-bottom overflow-hidden`}>
      {/* Efeito de brilho no header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      {/* Header da coluna */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700 text-sm flex items-center space-x-2">
            <span>{column.title}</span>
            {column.tasks.length > 0 && (
              <span className="bg-white/70 text-gray-600 text-xs px-2 py-1 rounded-full animate-fade-in">
                {column.tasks.length}
              </span>
            )}
          </h3>
          {column.tasks.length > 0 && (
            <Sparkles className="w-4 h-4 text-gray-400 animate-pulse-subtle" />
          )}
        </div>
        
        {/* Barra de progresso da coluna */}
        <div className="mt-2 w-full bg-white/50 rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transform origin-left transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(column.tasks.length * 20, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[300px] transition-all duration-200 rounded-lg p-2 ${
              snapshot.isDraggingOver 
                ? 'bg-white/60 ring-4 ring-blue-400 ring-opacity-30 scale-105 shadow-inner transform-gpu' 
                : ''
            }`}
          >
            {column.tasks.map((task, index) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                index={index} 
                onTaskClick={onTaskClick}
              />
            ))}
            {provided.placeholder}
            
            {/* Estado vazio com animação criativa */}
            {column.tasks.length === 0 && !isAdding && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-bounce-gentle">
                <div className="relative w-16 h-16 mb-3 flex items-center justify-center">
                  <div className="relative animate-float">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-lg transform rotate-12 shadow-sm"></div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-gradient-to-t from-green-400 to-green-500 rounded-full animate-sway"></div>
                    <div className="absolute -top-1 left-1/4 w-2 h-3 bg-gradient-to-t from-green-300 to-green-400 rounded-full animate-sway-reverse"></div>
                  </div>
                  {/* Partículas flutuantes */}
                  <div className="absolute top-0 left-0 w-1 h-1 bg-yellow-300 rounded-full animate-particle-float-1 opacity-60"></div>
                  <div className="absolute top-2 right-1 w-1 h-1 bg-green-300 rounded-full animate-particle-float-2 opacity-40"></div>
                  <div className="absolute bottom-1 left-2 w-1 h-1 bg-blue-300 rounded-full animate-particle-float-3 opacity-50"></div>
                </div>
                <p className="text-sm font-medium animate-fade-in-delay-1">Nada por aqui</p>
                <p className="text-xs text-gray-300 mt-1 animate-fade-in-delay-2">Arraste uma tarefa ou crie uma nova</p>
              </div>
            )}
            
            {/* Formulário de adicionar tarefa */}
            {isAdding ? (
              <div className="bg-white rounded-lg p-3 border-2 border-blue-300 shadow-lg animate-scale-in ring-1 ring-blue-200">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite o título da tarefa..."
                  className="w-full text-sm border-none outline-none resize-none bg-transparent placeholder-gray-400 focus:placeholder-gray-300 transition-colors duration-300"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewTaskTitle('');
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200 transform hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded hover:from-blue-600 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 hover:-translate-y-0.5"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="group/btn w-full flex items-center justify-center space-x-2 py-3 text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 border-dashed border-gray-300 hover:border-gray-400 animate-fade-in"
              >
                <Plus className="w-4 h-4 transform group-hover/btn:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-medium">Adicionar tarefa</span>
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
