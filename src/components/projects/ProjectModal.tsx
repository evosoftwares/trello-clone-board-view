
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Project } from '@/types/database';
import { useProjectData } from '@/hooks/useProjectData';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Folder, Save, Trash } from 'lucide-react';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  client_name: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  color: z.string().min(1, 'Cor é obrigatória'),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.coerce.number().optional(),
});

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { projects, createProject, updateProject, deleteProject } = useProjectData();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      client_name: '',
      status: 'active',
      color: PROJECT_COLORS[0],
      start_date: '',
      deadline: '',
      budget: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof projectFormSchema>) => {
    try {
      const projectData = {
        ...values,
        start_date: values.start_date || undefined,
        deadline: values.deadline || undefined,
        budget: values.budget || undefined,
      };

      if (selectedProject) {
        await updateProject(selectedProject.id, projectData);
        toast({ title: 'Projeto atualizado com sucesso!' });
      } else {
        await createProject(projectData);
        toast({ title: 'Projeto criado com sucesso!' });
      }
      
      resetForm();
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao salvar projeto', 
        variant: 'destructive' 
      });
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    form.reset({
      name: project.name,
      description: project.description || '',
      client_name: project.client_name || '',
      status: project.status,
      color: project.color,
      start_date: project.start_date || '',
      deadline: project.deadline || '',
      budget: project.budget || undefined,
    });
    setIsCreating(false);
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast({ title: 'Projeto deletado com sucesso!' });
      if (selectedProject?.id === projectId) {
        resetForm();
      }
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao deletar projeto', 
        variant: 'destructive' 
      });
    }
  };

  const resetForm = () => {
    setSelectedProject(null);
    setIsCreating(false);
    form.reset({
      name: '',
      description: '',
      client_name: '',
      status: 'active',
      color: PROJECT_COLORS[0],
      start_date: '',
      deadline: '',
      budget: undefined,
    });
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-white border-0 shadow-2xl rounded-3xl overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            Gerenciar Projetos
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-8 pb-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lista de Projetos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Projetos</h3>
                <Button 
                  onClick={startCreating}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl h-9 px-4 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo
                </Button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedProject?.id === project.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEdit(project)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <h4 className="font-semibold text-gray-900">{project.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 truncate">
                          {project.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={STATUS_OPTIONS.find(s => s.value === project.status)?.color}
                          >
                            {STATUS_OPTIONS.find(s => s.value === project.status)?.label}
                          </Badge>
                          {project.client_name && (
                            <span className="text-xs text-gray-500">
                              Cliente: {project.client_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {selectedProject ? 'Editar Projeto' : isCreating ? 'Novo Projeto' : 'Selecione um projeto'}
              </h3>
              
              {(selectedProject || isCreating) && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do projeto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Descrição do projeto"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="client_name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome do cliente" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STATUS_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <div className="flex gap-2 flex-wrap">
                            {PROJECT_COLORS.map(color => (
                              <button
                                key={color}
                                type="button"
                                className={`w-8 h-8 rounded-full border-2 ${
                                  field.value === color ? 'border-gray-400' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="start_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="deadline" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="budget" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orçamento</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field} 
                            placeholder="0.00" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {selectedProject ? 'Atualizar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 pb-8 pt-4 border-t border-gray-100">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
