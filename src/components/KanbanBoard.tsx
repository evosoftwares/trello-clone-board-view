
import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectContext } from '@/contexts/ProjectContext';
import KanbanColumn from './KanbanColumn';
import { TaskDetailModal } from './modals/TaskDetailModal';
import TeamMember from './TeamMember';
import { Task, Column } from '@/types/database';
import ProjectsSummary from './ProjectsSummary';

const KanbanBoard = () => {
  const { selectedProjectId } = useProjectContext();
  const { projects } = useProjectData();
  const {
    columns,
    tasks,
    profiles,
    tags,
    taskTags,
    loading,
    error,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refreshData
  } = useKanbanData(selectedProjectId);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [creatingTaskColumn, setCreatingTaskColumn] = useState<Column['id'] | null>(null);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Verificar se a tarefa está sendo movida DE uma coluna "Concluído"
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    
    const isSourceCompleted = sourceColumn?.title?.toLowerCase().includes('concluído') || 
                             sourceColumn?.title?.toLowerCase().includes('concluido') ||
                             sourceColumn?.title?.toLowerCase().includes('completed') ||
                             sourceColumn?.title?.toLowerCase().includes('done');

    // Bloquear movimento se a origem for "Concluído"
    if (isSourceCompleted) {
      console.log('[DRAG BLOCKED] Cannot move completed tasks');
      return;
    }

    console.log('[DRAG END] Moving task:', {
      taskId: draggableId,
      from: { columnId: source.droppableId, index: source.index },
      to: { columnId: destination.droppableId, index: destination.index }
    });

    moveTask(
      draggableId,
      source.droppableId,
      destination.droppableId
    );
  };

  const handleAddTask = (columnId: string) => {
    setCreatingTaskColumn(columnId);
    setIsCreatingTask(true);
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!creatingTaskColumn) return;
    console.log('[ADD TASK] Creating task:', { columnId: creatingTaskColumn, data: taskData });
    await createTask(taskData, creatingTaskColumn);
    setIsCreatingTask(false);
    setCreatingTaskColumn(null);
  };

  // Calcular estatísticas dos membros
  const teamMembersWithStats = profiles.map(member => {
    const memberTasks = tasks.filter(task => task.assignee === member.id);
    const functionPoints = memberTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
    
    return {
      ...member,
      taskCount: memberTasks.length,
      functionPoints
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Projects Summary Section */}
      <ProjectsSummary />

      {/* Team Members Section */}
      {teamMembersWithStats.length > 0 && (
        <div className="flex-shrink-0 space-y-3 lg:space-y-4">
          <h2 className="text-base lg:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Equipe ({teamMembersWithStats.length})
          </h2>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
            {teamMembersWithStats.map((member) => (
              <TeamMember key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-grow w-full flex gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
          {columns.map((column, index) => (
            <div 
              key={column.id} 
              className={`w-[calc(100vw-4rem)] sm:w-[320px] lg:w-[350px] xl:w-[380px] flex-shrink-0 snap-center
                ${index === 0 ? 'ml-4 sm:ml-0' : ''}
                ${index === columns.length - 1 ? 'mr-4 sm:mr-0' : ''}
              `}
            >
              <KanbanColumn
                column={column}
                tasks={tasks}
                tags={tags}
                taskTags={taskTags}
                projects={projects}
                profiles={profiles}
                columns={columns}
                onAddTask={handleAddTask}
                onTaskClick={setSelectedTask}
              />
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          teamMembers={profiles}
          projects={projects}
          tags={tags}
          taskTags={taskTags}
          updateTask={updateTask}
          deleteTask={deleteTask}
          refreshData={refreshData}
        />
      )}

      {isCreatingTask && (
        <TaskDetailModal
          isOpen={true}
          onClose={() => {
            setIsCreatingTask(false);
            setCreatingTaskColumn(null);
          }}
          teamMembers={profiles}
          projects={projects}
          tags={tags}
          taskTags={[]}
          createTask={handleCreateTask}
          deleteTask={deleteTask}
          refreshData={refreshData}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
