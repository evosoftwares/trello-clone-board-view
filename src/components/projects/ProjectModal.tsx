
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useProjectData } from '@/hooks/useProjectData';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/database';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  client_name: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  color: z.string().min(1, 'Cor é obrigatória'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  deadline: z.string().min(1, 'Prazo é obrigatório'),
  budget: z.coerce.number().min(0, 'Orçamento deve ser positivo'),
});

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const PROJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo', color: 'text-green-600' },
  { value: 'paused', label: 'Pausado', color: 'text-yellow-600' },
  { value: 'completed', label: 'Concluído', color: 'text-blue-600' },
  { value: 'cancelled', label: 'Cancelado', color: 'text-red-600' },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { projects, createProject, updateProject, deleteProject } = useProjectData();
  const { toast } = useToast();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      budget: 0,
    },
  });

  useEffect(() => {
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        description: editingProject.description || '',
        client_name: editingProject.client_name || '',
        status: editingProject.status,
        color: editingProject.color,
        start_date: editingProject.start_date,
        deadline: editingProject.deadline,
        budget: editingProject.budget,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        client_name: '',
        status: 'active',
        color: PROJECT_COLORS[0],
        start_date: '',
        deadline: '',
        budget: 0,
      });
    }
  }, [editingProject, form]);

  const onSubmit = async (values: z.infer<typeof projectFormSchema>) => {
    try {
      const projectData = {
        name: values.name,
        description: values.description,
        client_name: values.client_name,
        status: values.status,
        color: values.color,
        start_date: values.start_date,
        deadline: values.deadline,
        budget: values.budget,
      };

      if (editingProject) {
        await updateProject(editingProject.id, projectData);
        toast({ title: 'Projeto atualizado com sucesso!' });
      } else {
        await createProject(projectData);
        toast({ title: 'Projeto criado com sucesso!' });
      }
      
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao salvar o projeto.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast({ title: 'Projeto deletado com sucesso!' });
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao deletar o projeto.', 
        variant: 'destructive' 
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Gerenciar Projetos
            <Button
              onClick={handleAddNew}
              className="ml-auto bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isFormOpen ? (
          <div className="p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h3>
              <Button variant="outline" onClick={handleCloseForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o nome do projeto" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="client_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do cliente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrição do projeto" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_STATUS_OPTIONS.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              <span className={status.color}>{status.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor *</FormLabel>
                      <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              field.value === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo *</FormLabel>
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
                      <Input type="number" {...field} placeholder="0.00" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                    <Save className="w-4 h-4 mr-2" />
                    {editingProject ? 'Atualizar' : 'Criar'} Projeto
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <h4 className="font-semibold">{project.name}</h4>
                      <p className="text-sm text-gray-600">
                        {project.client_name && `Cliente: ${project.client_name} • `}
                        Status: {PROJECT_STATUS_OPTIONS.find(s => s.value === project.status)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(project)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O projeto será permanentemente deletado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(project.id)}>
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
