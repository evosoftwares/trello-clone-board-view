
import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

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
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onAddTask }) => {
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

  return (
    <div className="bg-gray-50 rounded-xl p-4 h-fit min-h-[400px]">
      <h3 className="font-medium text-gray-700 mb-4 text-sm">{column.title}</h3>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[300px] transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
            }`}
          >
            {column.tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
            
            {/* Empty state with plant icon */}
            {column.tasks.length === 0 && !isAdding && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-8 h-8 bg-yellow-300 rounded-lg"></div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-green-400 rounded-full"></div>
                    <div className="absolute -top-1 left-1/4 w-2 h-3 bg-green-300 rounded-full"></div>
                  </div>
                </div>
                <p className="text-sm font-medium">Nada por aqui</p>
              </div>
            )}
            
            {/* Add task form */}
            {isAdding ? (
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite o título da tarefa..."
                  className="w-full text-sm border-none outline-none resize-none"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewTaskTitle('');
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Adicionar tarefa</span>
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
