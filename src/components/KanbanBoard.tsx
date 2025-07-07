
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Trophy, Star, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { createLogger } from '@/utils/logger';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import { useUserPoints } from '@/hooks/useUserPoints';
import KanbanColumn from './KanbanColumn';
import { TaskDetailModal } from './modals/TaskDetailModal';
import TeamMember from './TeamMember';
import { Task, Column } from '@/types/database';
import ProjectsSummary from './ProjectsSummary';
import { SecurityAlert } from '@/components/ui/security-alert';
import ErrorBoundary from './ErrorBoundary';

const logger = createLogger('KanbanBoard');

const KanbanBoard = () => {
  const { selectedProjectId } = useProjectContext();
  const { projects } = useProjectData();
  const { getTaskPointAward, userPoints } = useUserPoints();
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
    showCelebrationMessage: false,
    isMessageExiting: false,
    completedTask: null as Task | null,
    celebrationMessage: "",
    pointsAwarded: 0,
    assigneeName: ""
  });

  // Refs for cleanup
  const celebrationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Cleanup function for timeouts
  const clearAllTimeouts = useCallback(() => {
    celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    celebrationTimeouts.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      celebrationTimeouts.current = [];
    };
  }, []);

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
      logger.info('Drag blocked: Cannot move completed tasks');
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

    logger.info('Moving task', {
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
  const triggerEpicCelebration = useCallback(async (completedTask: Task | null) => {
    // Clear any existing timeouts first
    clearAllTimeouts();
    
    // Generate random message once
    const celebrationMessage = getCelebrationMessage(completedTask);
    
    // Get assignee information and points awarded
    let pointsAwarded = 0;
    let assigneeName = "";
    
    if (completedTask?.assignee) {
      const assignee = profiles.find(p => p.id === completedTask.assignee);
      assigneeName = assignee?.name || "";
      
      // Check if points were awarded (with a small delay to ensure DB transaction completed)
      const pointsTimeout = setTimeout(async () => {
        if (completedTask.assignee) {
          try {
            const pointAward = await getTaskPointAward(completedTask.id, completedTask.assignee);
            if (pointAward) {
              pointsAwarded = pointAward.points_awarded;
              
              // Update celebration state with points info
              setCelebrationState(prev => ({
                ...prev,
                pointsAwarded,
                assigneeName
              }));
            }
          } catch (error) {
            logger.error('Error fetching task point award', error);
          }
        }
      }, 1000);
      celebrationTimeouts.current.push(pointsTimeout);
    }
    
    // Start single intense confetti animation
    setCelebrationState({
      showConfetti: true,
      showCelebrationMessage: true,
      isMessageExiting: false,
      completedTask,
      celebrationMessage,
      pointsAwarded: completedTask?.function_points || 0, // Show task points immediately
      assigneeName
    });

    // Start exit animation for message after 4.5 seconds
    const exitTimeout = setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        isMessageExiting: true
      }));
    }, 4500);
    celebrationTimeouts.current.push(exitTimeout);

    // Completely hide celebration message after exit animation (5.1 seconds)
    const hideTimeout = setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        showCelebrationMessage: false,
        isMessageExiting: false
      }));
    }, 5100);
    celebrationTimeouts.current.push(hideTimeout);

    // Stop confetti and cleanup after 10 seconds (let all pieces fall)
    const cleanupTimeout = setTimeout(() => {
      setCelebrationState({
        showConfetti: false,
        showCelebrationMessage: false,
        isMessageExiting: false,
        completedTask: null,
        celebrationMessage: "",
        pointsAwarded: 0,
        assigneeName: ""
      });
    }, 10000);
    celebrationTimeouts.current.push(cleanupTimeout);
  }, [profiles, getTaskPointAward, clearAllTimeouts]);

  // Get random celebration messages
  const getCelebrationMessage = (task: Task | null) => {
    const messages = [
      "🎉O cara é o Vitinho",
      "🔥 Vitinho é o cara!"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    return randomMessage;
  };

  const handleAddTask = (columnId: string) => {
    setCreatingTaskColumn(columnId);
    setIsCreatingTask(true);
  };

  const handleQuickAddTask = async (columnId: string, title: string) => {
    logger.info('Creating quick task', { columnId, title });
    try {
      await createTask({ title }, columnId);
      logger.info('Task creation completed');
    } catch (error) {
      logger.error('Task creation failed', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!creatingTaskColumn) return;

    const performCreate = async () => {
      logger.info('Creating task', { columnId: creatingTaskColumn, data: taskData });
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

  // Calcular estatísticas dos membros com memoização
  const teamMembersWithStats = useMemo(() => {
    return profiles.map(member => {
      const memberTasks = tasks.filter(task => task.assignee === member.id);
      const currentTaskPoints = memberTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
      
      // Find earned points using only user_id for consistency
      const earnedPointsData = userPoints.find(up => up.user_id === member.id);
      const earnedPoints = earnedPointsData?.total_points || 0;
      
      return {
        ...member,
        taskCount: memberTasks.length,
        functionPoints: currentTaskPoints, // Current task points
        earnedPoints: earnedPoints // Total earned points from completed tasks
      };
    });
  }, [profiles, tasks, userPoints]);

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
      {/* Epic Celebration Effects - Single Intense Confetti */}
      {celebrationState.showConfetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth || 1200}
          height={window.innerHeight || 800}
          recycle={false}
          numberOfPieces={800}
          gravity={0.15}
          colors={[
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', 
            '#98d8c8', '#f7dc6f', '#e74c3c', '#f39c12', '#27ae60', '#3498db', 
            '#9b59b6', '#e67e22', '#ffd700', '#ffed4e', '#f1c40f'
          ]}
          wind={0.05}
          initialVelocityX={8}
          initialVelocityY={-20}
          tweenDuration={5000}
        />
      )}
      
      {/* Celebration Message Overlay */}
      {celebrationState.showCelebrationMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`relative ${celebrationState.isMessageExiting ? 'animate-fadeOutDown' : 'animate-slideInScale'}`}>
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-3xl blur-lg opacity-75 animate-glowPulse scale-110"></div>
            
            {/* Main celebration card */}
            <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-8 py-6 rounded-3xl shadow-2xl transform">
              
              {/* Icon group with enhanced staggered animations */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-yellow-300 animate-smoothBounce" />
                <Sparkles className="h-6 w-6 text-yellow-200 animate-sparkleRotate" />
              </div>
              
              {/* Text content with smooth animations */}
              <div className="text-center">
                <h3 className={`text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent ${
                  celebrationState.isMessageExiting ? 'animate-fadeOutDown' : 'animate-fadeInUp'
                }`} style={{animationDelay: celebrationState.isMessageExiting ? '0s' : '0.3s'}}>
                  {celebrationState.celebrationMessage}
                </h3>
                {celebrationState.completedTask && (
                  <p className={`text-lg opacity-90 font-medium bg-gradient-to-r from-yellow-100 to-gray-100 bg-clip-text text-transparent ${
                    celebrationState.isMessageExiting ? 'animate-fadeOutDown' : 'animate-fadeInUp'
                  }`} style={{animationDelay: celebrationState.isMessageExiting ? '0.1s' : '0.5s'}}>
                    "{celebrationState.completedTask.title}"
                  </p>
                )}
                
                {/* Points awarded message */}
                {celebrationState.pointsAwarded > 0 && celebrationState.assigneeName && (
                  <div className={`mt-3 p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm ${
                    celebrationState.isMessageExiting ? 'animate-fadeOutDown' : 'animate-fadeInUp'
                  }`} style={{animationDelay: celebrationState.isMessageExiting ? '0.2s' : '0.7s'}}>
                    <p className="text-sm font-semibold text-yellow-100">
                      🎯 {celebrationState.pointsAwarded} pontos de função conquistados!
                    </p>
                    <p className="text-xs text-yellow-200 mt-1">
                      Parabéns, {celebrationState.assigneeName}!
                    </p>
                  </div>
                )}
              </div>
              
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
              <ErrorBoundary name={`KanbanColumn-${column.title}`}>
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
              </ErrorBoundary>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Modal */}
      {selectedTask && (
        <ErrorBoundary name="TaskDetailModal-Edit">
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
        </ErrorBoundary>
      )}

      {isCreatingTask && (
        <ErrorBoundary name="TaskDetailModal-Create">
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
        </ErrorBoundary>
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
