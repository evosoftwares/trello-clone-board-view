
import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';
import { KanbanColumn as ColumnType, Task, Tag, TaskTag } from '@/types/database';

interface KanbanColumnProps {
  column: ColumnType;
  tasks: Task[];
  tags: Tag[];
  taskTags: TaskTag[];
  onAddTask: (columnId: string, title: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  tasks = [], // Default to empty array
  tags = [], // Default to empty array
  taskTags = [], // Default to empty array
  onAddTask 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tasks for this column with null safety
  const columnTasks = (tasks || []).filter(task => task.column_id === column.id)
    .sort((a, b) => a.position - b.position);

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

  const handleStartAdding = () => {
    setIsAdding(true);
  };

  const handleCancelAdding = () => {
    setIsAdding(false);
    setNewTaskTitle('');
  };

  useEffect(() => {
    if (isAdding && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isAdding]);

  return (
    <div className="bg-gray-50 rounded-xl p-4 h-fit min-h-[400px] flex flex-col transition-all duration-300 ease-in-out">
      <h3 className="font-medium text-gray-700 mb-4 text-sm">{column.title}</h3>      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[300px] flex-grow transition-all duration-300 ease-in-out ${
              snapshot.isDraggingOver 
                ? 'bg-blue-50/80 rounded-lg ring-2 ring-blue-200/50 ring-inset transform scale-[1.02] shadow-lg' 
                : 'bg-transparent'
            }`}
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {columnTasks.map((task, index) => (
              <div
                key={task.id}
                className="transition-all duration-200 ease-in-out"
                style={{
                  transform: snapshot.isDraggingOver ? 'translateY(2px)' : 'translateY(0)',
                  transition: 'transform 0.2s ease-in-out',
                }}
              >
                <TaskCard 
                  task={task} 
                  index={index} 
                  tags={tags}
                  taskTags={taskTags}
                />
              </div>
            ))}
            {provided.placeholder}
            
            {/* Empty state with plant icon */}
            {columnTasks.length === 0 && !isAdding && (
              <div className={`flex flex-col items-center justify-center py-12 text-gray-400 transition-all duration-300 ${
                snapshot.isDraggingOver ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}>
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  <img
                    src="/imagens/small-pot.svg"
                    alt="Vaso de planta"
                    className="w-12 h-12 object-contain transition-transform duration-300 hover:scale-110" 
                  />
                </div>
                <p className="text-sm font-medium">Nada por aqui</p>
              </div>
            )}
            
            {/* Add task form / button container */}
            <div className="mt-auto pt-2">
              {/* Form */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isAdding ? 'max-h-40 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
                }`}
              >
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm transform transition-all duration-200 hover:shadow-md">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite o título da tarefa..."
                    className="w-full text-sm border-none outline-none resize-none"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={handleCancelAdding}
                      className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors duration-150"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-150 transform hover:scale-105"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* "Adicionar tarefa" button */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  !isAdding ? 'max-h-20 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
                }`}
              >
                <button
                  onClick={handleStartAdding}
                  className="w-full flex items-center justify-center space-x-2 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-sm">Adicionar tarefa</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
