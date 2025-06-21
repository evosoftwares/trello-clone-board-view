import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, Task, KanbanColumn as Column } from '@/types/database';

export interface ProjectSummary extends Project {
  taskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
  totalFunctionPoints: number;
}

const isDoneColumn = (columnName: string) => {
  const lowerCaseName = columnName.toLowerCase();
  return lowerCaseName.includes('done') || lowerCaseName.includes('concluído') || lowerCaseName.includes('concluido') || lowerCaseName.includes('completed');
};

export const useProjectsSummary = () => {
  const [projectsSummary, setProjectsSummary] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
      if (projectsError) throw projectsError;

      const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
      if (tasksError) throw tasksError;

      const { data: columns, error: columnsError } = await supabase.from('kanban_columns').select('*');
      if (columnsError) throw columnsError;
      
      const doneColumnIds = columns.filter(c => isDoneColumn(c.title)).map(c => c.id);

      const summary: ProjectSummary[] = projects.map(project => {
        const projectTasks = tasks.filter(task => task.project_id === project.id);
        const completedTasks = projectTasks.filter(task => task.column_id && doneColumnIds.includes(task.column_id));
        
        const taskCount = projectTasks.length;
        const completedTaskCount = completedTasks.length;
        const completionPercentage = taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0;
        const totalFunctionPoints = projectTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);

        return {
          ...project,
          taskCount,
          completedTaskCount,
          completionPercentage,
          totalFunctionPoints,
        };
      });

      setProjectsSummary(summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { projectsSummary, loading, error };
}; 