import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { Settings, AlertTriangle } from 'lucide-react';

import TeamMember from './TeamMember';
import KanbanColumn from './KanbanColumn';
import { ProjectSelector } from './projects/ProjectSelector';
import { ProjectModal } from './projects/ProjectModal';
import { TaskDetailModal } from './modals/TaskDetailModal';
import Confetti from 'react-confetti';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useProjectData } from '@/hooks/useProjectData';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/database';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const KanbanBoard = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem('selectedProjectId') || null;
  });
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  const { 
    columns, 
    tasks, 
    teamMembers, 
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
  
  const { projects, loading: projectsLoading } = useProjectData();
  const { toast } = useToast();
  const [runConfetti, setRunConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Persistir projeto selecionado no localStorage
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('selectedProjectId', selectedProjectId);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
  }, [selectedProjectId]);

  // Verify selected project still exists
  useEffect(() => {
    if (selectedProjectId && !projectsLoading && projects.length > 0) {
      const projectExists = projects.find(p => p.id === selectedProjectId);
      if (!projectExists) {
        console.log('Selected project no longer exists, clearing selection');
        setSelectedProjectId(null);
      }
    }
  }, [selectedProjectId, projects, projectsLoading]);

  const openTaskModal = (task: Task) => setSelectedTask(task);
  const closeTaskModal = () => setSelectedTask(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    // Find the task being moved
    const movedTask = tasks.find(task => task.id === draggableId);
    if (!movedTask) return;

    try {
      await moveTask(draggableId, destColumnId, destination.index);

      // Trigger confetti if moved to "Concluído" column
      const completedColumn = columns.find(col => col.title === 'Concluído');
      if (completedColumn && destColumnId === completedColumn.id && sourceColumnId !== destColumnId) {
        setRunConfetti(true);
        toast({
          title: "Parabéns! 🎉",
          description: `Tarefa "${movedTask.title}" foi concluída!`,
        });
        
        // Stop confetti after 8 seconds to let all pieces fall
        setTimeout(() => setRunConfetti(false), 8000);
      }
    } catch (err) {
      console.error('Error in drag end:', err);
    }
  };

  const handleAddTask = async (columnId: string, title: string) => {
    try {
      await createTask(columnId, title, selectedProjectId);
      
      if (selectedProjectId) {
        const project = projects.find(p => p.id === selectedProjectId);
        toast({
          title: "Sucesso",
          description: `Nova tarefa criada no projeto "${project?.name}"!`,
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Nova tarefa criada!",
        });
      }
    } catch (err) {
      console.error('Error adding task:', err);
      toast({
        title: "Erro",
        description: "Falha ao criar a tarefa. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // DEBUG: Detect any Realtime activity
  console.debug('[KANBAN BOARD] Mounted - should be no Realtime subscriptions here.');

  // Calculate stats for team members - only count function points from "Concluído" column
  const teamMembersWithStats = useMemo(() => {
    const completedColumn = columns.find(col => col.title === 'Concluído');
    
    return teamMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assignee === member.name);
      const completedTasks = completedColumn 
        ? memberTasks.filter(task => task.column_id === completedColumn.id)
        : [];
      
      const totalFunctionPoints = completedTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
      
      return {
        ...member,
        taskCount: memberTasks.length,
        functionPoints: totalFunctionPoints,
      };
    });
  }, [teamMembers, tasks, columns]);

  // Check if there are no projects and show helpful message
  const hasNoProjects = !projectsLoading && projects.length === 0;
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isLoading = loading || projectsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do Kanban...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confetti */}
      {runConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      {/* Refresh e erro sempre visíveis */}
      <div className="fixed top-3 right-3 z-50 flex gap-2">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm py-2 px-4 rounded-full shadow transition"
          onClick={refreshData}
          aria-label="Atualizar dados do Kanban"
        >
          Atualizar Kanban
        </button>
        {error && (
          <div className="bg-red-100 text-red-700 font-medium px-3 py-2 rounded shadow border border-red-300 flex items-center">
            {error}
          </div>
        )}
      </div>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Logo, Project Selector and Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <img src="/imagens/logo.svg" alt="Logo" className="w-32 h-32" />
              <ProjectSelector 
                selectedProjectId={selectedProjectId}
                onSelect={setSelectedProjectId}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowProjectModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2 px-6 rounded-full transition-colors duration-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Projetos
              </Button>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm py-2 px-6 rounded-full transition-colors duration-200">
                Protocolos
              </Button>
            </div>
          </div>

          {/* Project Status Alerts */}
          {hasNoProjects && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Nenhum projeto encontrado.</strong> Crie seu primeiro projeto para começar a organizar suas tarefas.
                <Button 
                  onClick={() => setShowProjectModal(true)}
                  variant="link" 
                  className="text-amber-600 hover:text-amber-700 p-0 ml-2 h-auto"
                >
                  Criar projeto agora
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!hasNoProjects && !selectedProjectId && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Visualizando todas as tarefas.</strong> Selecione um projeto específico para filtrar as tarefas por projeto.
              </AlertDescription>
            </Alert>
          )}

          {selectedProject && (
            <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedProject.name}</h3>
                  {selectedProject.description && (
                    <p className="text-sm text-gray-600">{selectedProject.description}</p>
                  )}
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Team Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teamMembersWithStats.map((member) => (
                <TeamMember key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {columns.map((column) => (
                  <KanbanColumn 
                    key={column.id} 
                    column={column} 
                    tasks={tasks}
                    tags={tags}
                    taskTags={taskTags}
                    projects={projects}
                    onAddTask={handleAddTask}
                    onTaskClick={openTaskModal}
                  />
                ))}
              </div>
            </div>
          </DragDropContext>
        </div>
      </div>
      
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={closeTaskModal}
          teamMembers={teamMembers}
          projects={projects}
          updateTask={updateTask}
          deleteTask={deleteTask}
        />
      )}
      
      <ProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
      />
    </>
  );
};

export default KanbanBoard;
