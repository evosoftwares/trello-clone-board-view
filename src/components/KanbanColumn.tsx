
import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import TaskCard from './TaskCard';
import { ProjectBadge } from './projects/ProjectBadge';
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
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

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

  // Agrupar tarefas por projeto apenas se for coluna concluída
  const groupedTasks = isCompletedColumn ? 
    columnTasks.reduce((acc, task) => {
      const projectId = task.project_id || 'sem-projeto';
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(task);
      return acc;
    }, {} as Record<string, Task[]>) : 
    null;

  const toggleProjectCollapse = (projectId: string) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
  };

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
    <div className="w-full h-full bg-gray-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 xl:p-5 flex flex-col">
      {/* Column Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3 lg:mb-4 xl:mb-5">
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
            className={`flex-grow space-y-2 lg:space-y-3 xl:space-y-4 min-h-0 rounded-lg lg:rounded-xl p-2 lg:p-3 xl:p-4
            overflow-y-auto overflow-x-hidden scroll-smooth
            ${
              snapshot.isDraggingOver
                ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
                : 'border-2 border-transparent'
            }`}
          >
            {/* Tasks - Organizados por projeto se for coluna concluída */}
            {isCompletedColumn && groupedTasks ? (
              <>
                {Object.entries(groupedTasks).map(([projectId, projectTasks]) => {
                  const project = projects.find(p => p.id === projectId);
                  const isCollapsed = collapsedProjects.has(projectId);
                  
                  return (
                    <div key={projectId} className="space-y-2">
                      {/* Cabeçalho do projeto */}
                      <div 
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleProjectCollapse(projectId)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        
                        {isCollapsed ? (
                          <Folder className="w-4 h-4 text-gray-400" />
                        ) : (
                          <FolderOpen className="w-4 h-4 text-gray-400" />
                        )}
                        
                        {project ? (
                          <ProjectBadge project={project} size="sm" />
                        ) : (
                          <div className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
                            <div className="w-2 h-2 rounded-full mr-1.5 bg-gray-400" />
                            Sem projeto
                          </div>
                        )}
                        
                        <span className="text-xs text-gray-500 ml-auto">
                          {projectTasks.length} {projectTasks.length === 1 ? 'tarefa' : 'tarefas'}
                        </span>
                      </div>
                      
                      {/* Tarefas do projeto */}
                      {!isCollapsed && (
                        <div className="ml-4 space-y-2">
                          {projectTasks.map((task, index) => (
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              // Layout normal para outras colunas
              columnTasks.map((task, index) => (
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
              ))
            )}
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
                    className="w-full mt-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Tarefa
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
