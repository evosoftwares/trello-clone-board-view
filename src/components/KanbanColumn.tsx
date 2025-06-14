
import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { KanbanColumn as KanbanColumnType, Task, Tag, TaskTag, Project } from '@/types/database';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  tags: Tag[];
  taskTags: TaskTag[];
  projects: Project[];
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  tasks, 
  tags, 
  taskTags, 
  projects,
  onAddTask,
  onTaskClick
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Sort tasks by position to ensure correct order
  const columnTasks = tasks
    .filter(task => task.column_id === column.id)
    .sort((a, b) => a.position - b.position);
  
  const totalFunctionPoints = columnTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);

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
    <div className="bg-gray-50 rounded-2xl p-4 h-fit">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-800">{column.title}</h3>
          <span className="bg-white text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
            {columnTasks.length}
          </span>
        </div>
        
        {/* Function Points Badge */}
        <div className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full font-medium border">
          {totalFunctionPoints} pts
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[200px] transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-blue-50 rounded-xl' : ''
            }`}
          >
            {/* Tasks - now properly sorted by position */}
            {columnTasks.map((task, index) => (
              <TaskCard 
                key={task.id}
                task={task}
                index={index}
                tags={tags}
                taskTags={taskTags}
                projects={projects}
                onTaskClick={onTaskClick}
              />
            ))}
            {provided.placeholder}

            {/* Add Task Button/Input */}
            <div className="mt-4">
              {isAdding ? (
                <div className="bg-white rounded-2xl p-4 border-2 border-blue-200 shadow-sm">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) {
                        setIsAdding(false);
                      }
                    }}
                    placeholder="Digite o título da tarefa..."
                    className="w-full outline-none text-gray-900 font-medium placeholder:text-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddTask}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setNewTaskTitle('');
                      }}
                      className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 bg-white/50 hover:bg-white/80 border-gray-300 hover:border-blue-300 text-gray-500 hover:text-blue-500 group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Adicionar tarefa</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
