
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Trophy, Star, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import KanbanColumn from './KanbanColumn';
import { TaskDetailModal } from './modals/TaskDetailModal';
import TeamMember from './TeamMember';
import { Task, Column } from '@/types/database';
import ProjectsSummary from './ProjectsSummary';
import { SecurityAlert } from '@/components/ui/security-alert';

const KanbanBoard = () => {
  const { selectedProjectId } = useProjectContext();
  const { projects } = useProjectData();
  const { 
    isSecurityAlertOpen, 
    showSecurityAlert, 
    hideSecurityAlert, 
    confirmedCallback,
    securityTitle,
    securityDescription
  } = useSecurityCheck();
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
  const [celebrationState, setCelebrationState] = useState({
    showConfetti: false,
    showSecondWave: false,
    showCelebrationMessage: false,
    completedTask: null as Task | null,
    celebrationMessage: ""
  });

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

    // Verificar se a tarefa está sendo movida PARA uma coluna "Sucesso" ou similar
    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    
    const isDestinationSuccess = destinationColumn?.title?.toLowerCase().includes('sucesso') || 
                                destinationColumn?.title?.toLowerCase().includes('success') ||
                                destinationColumn?.title?.toLowerCase().includes('concluído') ||
                                destinationColumn?.title?.toLowerCase().includes('concluido') ||
                                destinationColumn?.title?.toLowerCase().includes('completed') ||
                                destinationColumn?.title?.toLowerCase().includes('done');

    console.log('[DRAG END] Moving task:', {
      taskId: draggableId,
      from: { columnId: source.droppableId, index: source.index },
      to: { columnId: destination.droppableId, index: destination.index },
      isDestinationSuccess
    });

    moveTask(
      draggableId,
      source.droppableId,
      destination.droppableId,
      destination.index
    );

    // Trigger epic celebration when task is moved to success column
    if (isDestinationSuccess) {
      const completedTask = tasks.find(task => task.id === draggableId);
      triggerEpicCelebration(completedTask || null);
    }
  };

  // Epic celebration sequence function
  const triggerEpicCelebration = useCallback((completedTask: Task | null) => {
    // Generate random message once
    const celebrationMessage = getCelebrationMessage(completedTask);
    
    // Phase 1: Initial confetti burst
    setCelebrationState({
      showConfetti: true,
      showSecondWave: false,
      showCelebrationMessage: true,
      completedTask,
      celebrationMessage
    });

    // Phase 2: Second wave of confetti after 1 second
    setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        showSecondWave: true
      }));
    }, 1000);

    // Phase 3: Third wave and cleanup after 3 seconds
    setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        showConfetti: false,
        showSecondWave: false
      }));
    }, 4000);

    // Phase 4: Hide celebration message after 5 seconds
    setTimeout(() => {
      setCelebrationState({
        showConfetti: false,
        showSecondWave: false,
        showCelebrationMessage: false,
        completedTask: null,
        celebrationMessage: ""
      });
    }, 5000);
  }, []);

  // Get random celebration messages
  const getCelebrationMessage = (task: Task | null) => {
    const messages = [
      "🎉 Tarefa Concluída com Sucesso!",
      "🏆 Parabéns! Mais uma vitória!",
      "⭐ Excelente trabalho!",
      "🚀 Missão Cumprida!",
      "💪 Você é incrível!",
      "🎯 Objetivo Alcançado!",
      "✨ Fantástico! Continue assim!",
      "🌟 Mais um passo rumo ao sucesso!"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return randomMessage;
  };

  const handleAddTask = (columnId: string) => {
    setCreatingTaskColumn(columnId);
    setIsCreatingTask(true);
  };

  const handleQuickAddTask = async (columnId: string, title: string) => {
    console.log('[QUICK ADD TASK] Creating task:', { columnId, title });
    try {
      await createTask({ title }, columnId);
      console.log('[QUICK ADD TASK] Task creation completed');
    } catch (error) {
      console.error('[QUICK ADD TASK] Task creation failed:', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!creatingTaskColumn) return;

    const performCreate = async () => {
      console.log('[ADD TASK] Creating task:', { columnId: creatingTaskColumn, data: taskData });
      await createTask(taskData, creatingTaskColumn);
      setIsCreatingTask(false);
      setCreatingTaskColumn(null);
    };

    showSecurityAlert(
      performCreate,
      'Confirmar Criação',
      'Digite a senha para confirmar a criação da tarefa:'
    );
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
      {/* Epic Celebration Effects */}
      {celebrationState.showConfetti && (
        <>
          {/* Main confetti burst */}
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            gravity={0.25}
            colors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f']}
            wind={0.05}
          />
          
          {/* Second wave - different angle and colors */}
          {celebrationState.showSecondWave && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={150}
              gravity={0.15}
              colors={['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22']}
              initialVelocityX={-5}
              initialVelocityY={-10}
              wind={-0.05}
            />
          )}
        </>
      )}
      
      {/* Celebration Message Overlay */}
      {celebrationState.showCelebrationMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-6 rounded-2xl shadow-2xl transform animate-bounce">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-300 animate-pulse" />
              <Sparkles className="h-6 w-6 text-yellow-200 animate-spin" />
              <Star className="h-7 w-7 text-yellow-300 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 animate-pulse">
                {celebrationState.celebrationMessage}
              </h3>
              {celebrationState.completedTask && (
                <p className="text-lg opacity-90 font-medium">
                  "{celebrationState.completedTask.title}"
                </p>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )}
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
                onAddTask={handleQuickAddTask}
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

      {/* Security Alert */}
      <SecurityAlert
        open={isSecurityAlertOpen}
        onOpenChange={hideSecurityAlert}
        onConfirm={confirmedCallback || (() => {})}
        title={securityTitle}
        description={securityDescription}
      />
    </div>
  );
};

export default KanbanBoard;
