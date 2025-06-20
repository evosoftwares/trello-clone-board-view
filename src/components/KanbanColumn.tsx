
import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { KanbanColumn as KanbanColumnType, Task, Tag, TaskTag, Project, Profile } from '@/types/database';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  tags: Tag[];
  taskTags: TaskTag[];
  projects: Project[];
  profiles: Profile[];
  columns: KanbanColumnType[];
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  column, 
  tasks, 
  tags, 
  taskTags, 
  projects,
  profiles,
  columns,
  onAddTask,
  onTaskClick
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Sort tasks by position with fallback to created_at for consistency
  const columnTasks = tasks
    .filter(task => task.column_id === column.id)
    .sort((a, b) => {
      // Primary sort: position
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // Fallback sort: created_at for tasks with same position
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  
  const totalFunctionPoints = columnTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);

  // Verificar se é a coluna "Concluído"
  const isCompletedColumn = column.title?.toLowerCase().includes('concluído') || 
                           column.title?.toLowerCase().includes('concluido') ||
                           column.title?.toLowerCase().includes('completed') ||
                           column.title?.toLowerCase().includes('done');

  console.log(`[COLUMN ${column.title}] Tasks:`, columnTasks.map(t => ({ id: t.id, title: t.title, position: t.position })));

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
    <div className="w-full bg-gray-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 xl:p-5 h-fit">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4 xl:mb-5">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <div 
            className="w-2.5 h-2.5 lg:w-3 lg:h-3 xl:w-3.5 xl:h-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-800 text-sm lg:text-base xl:text-lg truncate">{column.title}</h3>
          <span className="bg-white text-gray-600 text-xs lg:text-sm px-2 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 rounded-full font-medium flex-shrink-0">
            {columnTasks.length}
          </span>
        </div>
        
        {/* Function Points Badge */}
        <div className="bg-white text-gray-700 text-xs lg:text-sm px-2 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 rounded-full font-medium border flex-shrink-0">
          {totalFunctionPoints} pts
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 lg:space-y-3 xl:space-y-4 min-h-[150px] lg:min-h-[200px] xl:min-h-[250px] rounded-lg lg:rounded-xl p-2 lg:p-3 xl:p-4 ${
              snapshot.isDraggingOver
                ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
                : 'border-2 border-transparent'
            }`}
          >
            {/* Tasks */}
            {columnTasks.map((task, index) => (
              <TaskCard 
                key={task.id}
                task={task}
                index={index}
                tags={tags}
                taskTags={taskTags}
                projects={projects}
                columns={columns}
                onClick={() => onTaskClick(task)}
                teamMembers={profiles}
              />
            ))}
            {provided.placeholder}

            {/* Visual feedback for drop zone */}
            {snapshot.isDraggingOver && (
              <div className="flex items-center justify-center py-3 lg:py-4 xl:py-5 text-xs lg:text-sm xl:text-base font-medium text-blue-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 rounded-full bg-blue-500"></div>
                  <span className="text-center">
                    {isCompletedColumn 
                      ? 'Solte aqui para concluir a tarefa'
                      : `Solte aqui para adicionar à ${column.title}`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Add Task Button/Input */}
            {!isCompletedColumn && (
              <div className="mt-3 lg:mt-4 xl:mt-5">
                {isAdding ? (
                  <div className="bg-white rounded-xl lg:rounded-2xl p-3 lg:p-4 xl:p-5 border-2 border-blue-200 shadow-sm">
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
                      className="w-full outline-none text-gray-900 font-medium placeholder:text-gray-400 text-sm lg:text-base xl:text-lg"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2 lg:mt-3 xl:mt-4">
                      <button
                        onClick={handleAddTask}
                        className="bg-blue-500 text-white px-3 lg:px-4 xl:px-5 py-1.5 lg:py-2 xl:py-2.5 rounded-lg text-xs lg:text-sm xl:text-base font-medium hover:bg-blue-600"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewTaskTitle('');
                        }}
                        className="bg-gray-200 text-gray-600 px-3 lg:px-4 xl:px-5 py-1.5 lg:py-2 xl:py-2.5 rounded-lg text-xs lg:text-sm xl:text-base font-medium hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full border-2 border-dashed rounded-xl lg:rounded-2xl p-3 lg:p-4 xl:p-5 flex items-center justify-center gap-2 text-xs lg:text-sm xl:text-base font-medium bg-white/50 hover:bg-white/80 border-gray-300 hover:border-blue-300 text-gray-500 hover:text-blue-500 group"
                  >
                    <Plus className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
                    <span>Adicionar tarefa</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
