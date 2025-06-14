
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DragDropContext } from '@hello-pangea/dnd';
import { Trash, User, Clock, Target, Save } from 'lucide-react';

import TeamMember from './TeamMember';
import KanbanColumn from './KanbanColumn';
import Confetti from 'react-confetti';
import { useKanbanData } from '@/hooks/useKanbanData';
import { useToast } from '@/hooks/use-toast';
import { Task, TeamMember as TeamMemberType, Tag, TaskTag } from '@/types/database';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// --- Kanban Context ---
// Due to project constraints, the context and modal are defined here.
interface KanbanContextType {
  openTaskModal: (task: Task) => void;
  teamMembers: TeamMemberType[];
  tags: Tag[];
  taskTags: TaskTag[];
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const useKanban = () => {
  const context = useContext(KanbanContext);
  if (!context) throw new Error('useKanban must be used within a KanbanProvider');
  return context;
};

// --- Task Detail Modal Component ---
const taskFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório.'),
  description: z.string().optional(),
  assignee: z.string().optional(),
  function_points: z.coerce.number().min(0).optional(),
  complexity: z.enum(['low', 'medium', 'high']),
});

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const UNASSIGNED_VALUE = 'unassigned-sentinel';

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose }) => {
  const { teamMembers, updateTask, deleteTask } = useKanban();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title || '',
      description: task.description || '',
      assignee: task.assignee || UNASSIGNED_VALUE,
      function_points: task.function_points || 0,
      complexity: task.complexity || 'medium',
    },
  });

  useEffect(() => {
    form.reset({
      title: task.title || '',
      description: task.description || '',
      assignee: task.assignee || UNASSIGNED_VALUE,
      function_points: task.function_points || 0,
      complexity: task.complexity || 'medium',
    });
  }, [task, form]);

  const getComplexityConfig = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Baixa' };
      case 'medium':
        return { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Média' };
      case 'high':
        return { color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Alta' };
      default:
        return { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Média' };
    }
  };

  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        ...values,
        assignee: values.assignee === UNASSIGNED_VALUE ? null : values.assignee,
      };
      await updateTask(task.id, updates);
      toast({ 
        title: 'Sucesso! ✨', 
        description: 'Tarefa atualizada com sucesso.',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });
      onClose();
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao atualizar a tarefa.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast({ 
        title: 'Tarefa removida', 
        description: 'A tarefa foi deletada com sucesso.',
        className: 'bg-red-50 border-red-200 text-red-900'
      });
      onClose();
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao deletar a tarefa.', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const complexityConfig = getComplexityConfig(form.watch('complexity'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] bg-white border-0 shadow-2xl rounded-3xl overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-2">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            Editar Tarefa
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-8 pb-8 overflow-y-auto">
          <Form {...form}>
            <form id="edit-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title Field */}
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Título
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                      placeholder="Digite o título da tarefa..."
                    />
                  </FormControl>
                  <FormMessage className="text-rose-600 text-xs" />
                </FormItem>
              )} />

              {/* Description Field */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Descrição
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={4} 
                      className="border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none" 
                      placeholder="Descreva os detalhes da tarefa..."
                    />
                  </FormControl>
                  <FormMessage className="text-rose-600 text-xs" />
                </FormItem>
              )} />

              {/* Assignee Field */}
              <FormField control={form.control} name="assignee" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Responsável
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                      <SelectItem value={UNASSIGNED_VALUE} className="rounded-lg">
                        <span className="text-gray-500">Não atribuído</span>
                      </SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.name} className="rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-sm font-medium">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-rose-600 text-xs" />
                </FormItem>
              )} />

              {/* Function Points and Complexity Row */}
              <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="function_points" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      Pontos de Função
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        className="h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-600 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="complexity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Complexidade
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                          <SelectValue placeholder="Selecione a complexidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                        <SelectItem value="low" className="rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                            Baixa
                          </div>
                        </SelectItem>
                        <SelectItem value="medium" className="rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            Média
                          </div>
                        </SelectItem>
                        <SelectItem value="high" className="rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                            Alta
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-rose-600 text-xs" />
                  </FormItem>
                )} />
              </div>

              {/* Complexity Preview */}
              <div className={`p-4 rounded-xl border ${complexityConfig.color} transition-all duration-200`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complexidade Selecionada</span>
                  <span className="font-semibold">{complexityConfig.label}</span>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-8 pb-8 pt-4 border-t border-gray-100 flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl h-11 px-6 transition-all duration-200"
              >
                <Trash className="w-4 h-4 mr-2" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">
                  Confirmar exclusão
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Esta ação não pode ser desfeita. A tarefa será permanentemente deletada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="rounded-xl h-11">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-700 rounded-xl h-11"
                >
                  {isDeleting ? 'Deletando...' : 'Deletar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-3">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl h-11 px-6 border-gray-200 hover:bg-gray-50 transition-all duration-200"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              form="edit-task-form" 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Main Kanban Board Component ---
const KanbanBoard = () => {
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
  } = useKanbanData();
  
  const { toast } = useToast();
  const [runConfetti, setRunConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
      await createTask(columnId, title);
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

  const contextValue = {
    openTaskModal, teamMembers, tags, taskTags, updateTask, deleteTask
  };

  return (
    <KanbanContext.Provider value={contextValue}>
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
          {/* Header with Logo and Button */}
          <div className="flex items-center justify-between mb-1">
            <img src="/imagens/logo.svg" alt="Logo" className="w-32 h-32" />
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm py-2 px-6 rounded-full transition-colors duration-200">
              Protocolos
            </button>
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
                    onAddTask={handleAddTask}
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
        />
      )}
    </KanbanContext.Provider>
  );
};

export default KanbanBoard;
