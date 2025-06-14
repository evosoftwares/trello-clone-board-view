
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { Settings } from 'lucide-react';

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

const KanbanBoard = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // Recuperar projeto selecionado do localStorage
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
    deleteTask 
  } = useKanbanData(selectedProjectId);
  
  const { projects } = useProjectData();
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
      }
    } catch (err) {
      console.error('Error in drag end:', err);
    }
  };

  const handleAddTask = async (columnId: string, title: string) => {
    try {
      // If no project selected, show warning
      if (!selectedProjectId) {
        toast({
          title: "Atenção",
          description: "Selecione um projeto antes de criar uma tarefa.",
          variant: "destructive"
        });
        return;
      }

      await createTask(columnId, title, selectedProjectId);
      toast({
        title: "Sucesso",
        description: "Nova tarefa criada!",
      });
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  // Calculate stats for team members - only count function points from "Concluído" column
  const teamMembersWithStats = useMemo(() => {
    // Find the "Concluído" column
    const completedColumn = columns.find(col => col.title === 'Concluído');
    
    return teamMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assignee === member.name);
      
      // Only count function points from completed tasks
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
      {runConfetti && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999
        }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.25}
            onConfettiComplete={() => setRunConfetti(false)}
          />
        </div>,
        document.body
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Logo, Project Selector and Buttons */}
          <div className="flex items-center justify-between mb-1">
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
