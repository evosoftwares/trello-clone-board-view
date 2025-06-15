
import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectContext } from '@/contexts/ProjectContext';
import KanbanColumn from './KanbanColumn';
import { TaskDetailModal } from './modals/TaskDetailModal';
import TeamMember from './TeamMember';
import { Task } from '@/types/database';

const KanbanBoard = () => {
  const { selectedProjectId } = useProjectContext();
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
    <div className="space-y-6">
      {/* Team Members Section */}
      {teamMembersWithStats.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Equipe ({teamMembersWithStats.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamMembersWithStats.map((member) => (
              <TeamMember key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="min-w-[320px]">
              <KanbanColumn
                column={column}
                tasks={tasks}
                tags={tags}
                taskTags={taskTags}
                projects={[]}
                profiles={profiles}
                columns={columns} // Passar todas as colunas
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
          projects={[]}
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
