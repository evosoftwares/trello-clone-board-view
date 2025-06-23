import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/database';
import { QUERY_KEYS, invalidateRelatedQueries } from '@/lib/queryClient';

const fetchProjects = async (): Promise<Project[]> => {
  console.debug('[OPTIMIZED PROJECT DATA] Fetching projects...');
  
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error('[OPTIMIZED PROJECT DATA] Error fetching projects:', error);
    throw error;
  }

  console.debug('[OPTIMIZED PROJECT DATA] Projects fetched successfully:', data?.length);
  return data as Project[];
};

export const useOptimizedProjectData = () => {
  const queryClient = useQueryClient();

  // Query for fetching projects
  const {
    data: projects = [],
    isLoading: loading,
    error,
    refetch: fetchProjects
  } = useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: fetchProjects,
    staleTime: 2 * 60 * 1000, // 2 minutes - projects don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
  });

  // Real-time subscription using React Query's built-in refetch
  // This is more efficient than individual subscriptions
  React.useEffect(() => {
    const channelName = `optimized-projects-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, () => {
        // Instead of manual fetch, invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      })
      .subscribe();
    
    return () => channel.unsubscribe();
  }, [queryClient]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (project: Omit<Project, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("projects")
        .insert([project])
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (newProject) => {
      // Optimistically update cache
      queryClient.setQueryData(QUERY_KEYS.projects, (oldProjects: Project[] = []) => [
        newProject,
        ...oldProjects
      ]);
    },
    onError: (error) => {
      console.error('[CREATE PROJECT] Error:', error);
      // Refetch on error to sync with server
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (updatedProject) => {
      // Optimistically update cache
      queryClient.setQueryData(QUERY_KEYS.projects, (oldProjects: Project[] = []) =>
        oldProjects.map(project => 
          project.id === updatedProject.id ? updatedProject : project
        )
      );
      
      // Invalidate related kanban data
      invalidateRelatedQueries(queryClient, 'project', updatedProject.id);
    },
    onError: (error) => {
      console.error('[UPDATE PROJECT] Error:', error);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      // Optimistically update cache
      queryClient.setQueryData(QUERY_KEYS.projects, (oldProjects: Project[] = []) =>
        oldProjects.filter(project => project.id !== deletedId)
      );
      
      // Invalidate related kanban data
      invalidateRelatedQueries(queryClient, 'project', deletedId);
    },
    onError: (error) => {
      console.error('[DELETE PROJECT] Error:', error);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    }
  });

  return {
    projects,
    loading,
    error: error?.message || null,
    fetchProjects,
    createProject: createProjectMutation.mutate,
    updateProject: (id: string, updates: Partial<Project>) => 
      updateProjectMutation.mutate({ id, updates }),
    deleteProject: deleteProjectMutation.mutate,
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
  };
};