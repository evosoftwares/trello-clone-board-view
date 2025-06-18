import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjectData } from '@/hooks/useProjectData';
import KanbanColumn from './KanbanColumn';
import { TaskDetailModal } from './modals/TaskDetailModal';
import TeamMember from './TeamMember';
import { Task } from '@/types/database';

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

  const handleAddTask = (columnId: string, title: string) => {
    console.log('[ADD TASK] Creating task:', { columnId, title });
    createTask(title, columnId);
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

  // Get selected project info
  const selectedProject = projects.find(p => p.id === selectedProjectId);

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
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Project Info */}
      {selectedProject && (
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedProject.color }}
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedProject.name}</h2>
              {selectedProject.description && (
                <p className="text-sm text-gray-600">{selectedProject.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                {selectedProject.client_name && (
                  <span>Cliente: {selectedProject.client_name}</span>
                )}
                <span>Status: {selectedProject.status === 'active' ? 'Ativo' : 
                              selectedProject.status === 'paused' ? 'Pausado' :
                              selectedProject.status === 'completed' ? 'Concluído' : 'Cancelado'}</span>
                {selectedProject.deadline && (
                  <span>Prazo: {new Date(selectedProject.deadline).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Section */}
      {teamMembersWithStats.length > 0 && (
        <div className="space-y-3 lg:space-y-4">
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
        <div className="w-full flex gap-4 lg:gap-6 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="min-w-[280px] sm:min-w-[300px] lg:min-w-[320px] xl:min-w-[350px] flex-shrink-0">
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
    </div>
  );
};

export default KanbanBoard;
