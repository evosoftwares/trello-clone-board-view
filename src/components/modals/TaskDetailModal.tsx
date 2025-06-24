import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createLogger } from '@/utils/logger';
import { Trash, User, Clock, Target, Save, Tag, MessageCircle } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import { Task, TeamMember, Project, Tag as TagType, TaskTag } from '@/types/database';
import { TagSelector } from '@/components/tags/TagSelector';
import { TaskComments } from '@/components/comments/TaskComments';
import { useTagMutations } from '@/hooks/useTagMutations';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityAlert } from '@/components/ui/security-alert';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório.'),
  description: z.string().optional(),
  assignee: z.string().optional(),
  function_points: z.coerce.number().min(0).optional(),
  complexity: z.string(),
  project_id: z.string().nullable().optional(),
});

interface TaskDetailModalProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  projects: Project[];
  tags: TagType[];
  taskTags: TaskTag[];
  updateTask?: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  createTask?: (taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshData: () => void;
}

const UNASSIGNED_VALUE = 'unassigned-sentinel';
const logger = createLogger('TaskDetailModal');

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  task, 
  isOpen, 
  onClose, 
  teamMembers, 
  projects,
  tags,
  taskTags,
  updateTask,
  createTask,
  deleteTask,
  refreshData
}) => {
  const { toast } = useToast();
  const { 
    isSecurityAlertOpen, 
    showSecurityAlert, 
    hideSecurityAlert, 
    confirmedCallback,
    securityTitle,
    securityDescription
  } = useSecurityCheck();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isCreating = !task;

  const {
    createTag,
    updateTag,
    deleteTag,
    addTagToTask,
    removeTagFromTask
  } = useTagMutations();
  
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      assignee: task?.assignee || UNASSIGNED_VALUE,
      function_points: task?.function_points || 0,
      complexity: task?.complexity || 'medium',
      project_id: task?.project_id || null,
    },
  });

  useEffect(() => {
    if (task) {
      logger.info('Task data loaded', task);
      form.reset({
        title: task?.title || '',
        description: task?.description || '',
        assignee: task?.assignee || UNASSIGNED_VALUE,
        function_points: task?.function_points || 0,
        complexity: task?.complexity || 'medium',
        project_id: task?.project_id || null,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        assignee: UNASSIGNED_VALUE,
        function_points: 0,
        complexity: 'medium',
        project_id: null,
      });
    }
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

  const handleTagOperations = {
    createTag: async (name: string, color: string) => {
      if (isCreating) {
        toast({ title: 'Ação bloqueada', description: 'Salve a tarefa antes de gerenciar etiquetas.' });
        return;
      }
      await createTag(name, color);
      refreshData();
    },
    updateTag: async (tagId: string, name: string, color: string) => {
      await updateTag(tagId, name, color);
      refreshData();
    },
    deleteTag: async (tagId: string) => {
      await deleteTag(tagId);
      refreshData();
    },
    addTagToTask: async (taskId: string, tagId: string) => {
      await addTagToTask(taskId, tagId);
      refreshData();
    },
    removeTagFromTask: async (taskId: string, tagId: string) => {
      await removeTagFromTask(taskId, tagId);
      refreshData();
    }
  };

  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    const taskData: Partial<Task> = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      assignee: values.assignee === UNASSIGNED_VALUE ? null : values.assignee,
      function_points: values.function_points || 0,
      complexity: values.complexity,
      project_id: values.project_id || null,
    };

    const performOperation = async () => {
      setIsSaving(true);
      try {
        logger.info('Form values', values);
        
        if (isCreating) {
          if (!createTask) {
            throw new Error('createTask function is not provided');
          }
          await createTask(taskData);
          toast({ 
            title: 'Sucesso! ✨', 
            description: 'Tarefa criada com sucesso.',
            className: 'bg-blue-50 border-blue-200 text-blue-900'
          });
        } else {
          if (!updateTask || !task) {
            throw new Error('updateTask function or task is not provided');
          }
          await updateTask(task.id, taskData);
          toast({ 
            title: 'Sucesso! ✨', 
            description: 'Tarefa atualizada com sucesso.',
            className: 'bg-blue-50 border-blue-200 text-blue-900'
          });
        }
        onClose();
      } catch (error) {
        logger.error(`${isCreating ? 'Create' : 'Update'} error`, error);
        toast({ 
          title: 'Erro', 
          description: `Falha ao ${isCreating ? 'criar' : 'atualizar'} a tarefa.`, 
          variant: 'destructive' 
        });
      } finally {
        setIsSaving(false);
      }
    };

    showSecurityAlert(
      performOperation,
      isCreating ? 'Confirmar Criação' : 'Confirmar Edição',
      isCreating 
        ? 'Digite a senha para confirmar a criação da tarefa:' 
        : 'Digite a senha para confirmar a edição da tarefa:'
    );
  };

  const handleDelete = async () => {
    if (isCreating || !task) return;

    const performDelete = async () => {
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
        logger.error('Delete error', error);
        toast({ 
          title: 'Erro', 
          description: 'Falha ao deletar a tarefa.', 
          variant: 'destructive' 
        });
      } finally {
        setIsDeleting(false);
      }
    };

    showSecurityAlert(
      performDelete,
      'Confirmar Exclusão',
      'Digite a senha para confirmar a exclusão da tarefa:'
    );
  };

  const complexityConfig = getComplexityConfig(form.watch('complexity'));
  const selectedProject = projects.find(p => p.id === form.watch('project_id'));

  // Get current task tags for display
  const currentTaskTagIds = taskTags
    .filter(tt => tt.task_id === task?.id)
    .map(tt => tt.tag_id);
  const currentTaskTags = tags.filter(tag => currentTaskTagIds.includes(tag.id));

  // Get assignee name
  const assignee = teamMembers.find(member => member.id === task?.assignee);
  const assigneeName = assignee ? assignee.name : 'Não atribuído';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] bg-white border-0 shadow-2xl rounded-3xl overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-2">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            {isCreating ? 'Criar Tarefa' : 'Editar Tarefa'}
            {selectedProject && (
              <div 
                className="ml-auto px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: selectedProject.color + '20', 
                  color: selectedProject.color 
                }}
              >
                {selectedProject.name}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-8 pb-8 overflow-y-auto">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Comentários
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Tags Section */}
              <div className="p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    Etiquetas
                  </h4>
                  <TagSelector
                    taskId={task?.id || ''}
                    allTags={tags}
                    taskTags={taskTags}
                    onAddTagToTask={handleTagOperations.addTagToTask}
                    onRemoveTagFromTask={handleTagOperations.removeTagFromTask}
                    onCreateTag={handleTagOperations.createTag}
                    onUpdateTag={handleTagOperations.updateTag}
                    onDeleteTag={handleTagOperations.deleteTag}
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 rounded-lg">
                        <Tag className="w-4 h-4 mr-1" />
                        Gerenciar
                      </Button>
                    }
                  />
                </div>
                
                {currentTaskTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentTaskTags.map((tag) => (
                      <span 
                        key={tag.id} 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                        style={{ 
                          backgroundColor: tag.color + '15', 
                          borderColor: tag.color + '30',
                          color: tag.color 
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhuma etiqueta atribuída</p>
                )}
              </div>

              {/* Assignee Display */}
              <div className="p-4 bg-blue-50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Responsável Atual
                  </h4>
                  {!isCreating && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${assignee ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {assigneeName}
                    </span>
                  )}
                </div>
                {!isCreating && (
                  <p className="mt-2 text-lg font-bold text-blue-900">
                    {assigneeName}
                  </p>
                )}
              </div>

              {/* Form Fields */}
              <Form {...form}>
                <form id="edit-task-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Project Field */}
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Projeto
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200">
                            <SelectValue placeholder="Sem projeto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Sem projeto</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-rose-600 text-xs" />
                    </FormItem>
                  )} />

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
                          className="h-12 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200" 
                          placeholder="Digite o título da tarefa..."
                        />
                      </FormControl>
                      <FormMessage className="text-rose-600 text-xs" />
                    </FormItem>
                  )} />

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
                          className="border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200 resize-none" 
                          placeholder="Descreva os detalhes da tarefa..."
                        />
                      </FormControl>
                      <FormMessage className="text-rose-600 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="assignee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        Responsável
                      </FormLabel>
                      <Select 
                        value={field.value || UNASSIGNED_VALUE}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200">
                            <SelectValue placeholder="Não atribuído" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>Não atribuído</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

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
                            className="h-12 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200" 
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
                            <SelectTrigger className="h-12 border-gray-200 rounded-xl focus:border-blue-500 transition-all duration-200">
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

                  <div className={`p-4 rounded-xl border ${complexityConfig.color} transition-all duration-200`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Complexidade Selecionada</span>
                      <span className="font-semibold">{complexityConfig.label}</span>
                    </div>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="comments" className="mt-6">
              <TaskComments taskId={task?.id || ''} allProfiles={teamMembers} />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-8 pb-8 pt-4 bg-white">
          <div className="w-full flex justify-between items-center">
            <div>
              {!isCreating && task && (
                <Button 
                  variant="destructive" 
                  type="button" 
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? 'Deletando...' : <><Trash className="w-4 h-4 mr-2" /> Deletar</>}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                form="edit-task-form" 
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
      
      <SecurityAlert
        open={isSecurityAlertOpen}
        onOpenChange={hideSecurityAlert}
        onConfirm={confirmedCallback || (() => {})}
        title={securityTitle}
        description={securityDescription}
      />
    </Dialog>
  );
};
