
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DragDropContext } from '@hello-pangea/dnd';
import { Trash } from 'lucide-react';

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
  title: z.string().min(1, 'Title is required.'),
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

  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    try {
      const updates: Partial<Task> = {
        ...values,
        assignee: values.assignee === UNASSIGNED_VALUE ? null : values.assignee,
      };
      await updateTask(task.id, updates);
      toast({ title: 'Success', description: 'Task updated successfully.' });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast({ title: 'Success', description: 'Task deleted.' });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] grid-rows-[auto_1fr_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-6">
            <Form {...form}>
              <form id="edit-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assignee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select an assignee" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                        {teamMembers.map(member => (
                          <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="function_points" render={({ field }) => (
                        <FormItem><FormLabel>Function Points</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="complexity" render={({ field }) => (
                        <FormItem><FormLabel>Complexity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select complexity" /></SelectTrigger></FormControl><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                </div>
              </form>
            </Form>
        </div>
        <DialogFooter className="pt-4 border-t items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mr-auto"><Trash className="w-4 h-4 mr-2"/> Delete Task</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="edit-task-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
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

  // Calculate stats for team members
  const teamMembersWithStats = useMemo(() => {
    return teamMembers.map(member => {
      const memberTasks = tasks.filter(task => task.assignee === member.name);
      const totalFunctionPoints = memberTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
      
      return {
        ...member,
        taskCount: memberTasks.length,
        functionPoints: totalFunctionPoints,
      };
    });
  }, [teamMembers, tasks]);

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
