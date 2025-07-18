
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/database";
import { createLogger } from '@/utils/logger';

const logger = createLogger('useProjectData');

// DEBUG: Add logging to track subscription lifecycle
logger.debug('Hook loaded - checking for subscription issues');

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects, order by created_at desc
  const fetchProjects = useCallback(async () => {
    logger.debug('Fetching projects...');
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error('Error fetching projects', error);
      setError(error.message);
      setProjects([]);
    } else {
      logger.debug('Projects fetched successfully', data?.length);
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    
    // Create a unique channel name to avoid conflicts
    const channelName = `projects-realtime-${Math.random().toString(36).substr(2, 9)}`;
    logger.debug('Creating channel', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        logger.debug('Realtime update received', payload);
        fetchProjects();
      })
      .subscribe((status) => {
        logger.debug('Channel subscription status', status);
      });
    
    return () => {
      logger.debug('Cleaning up channel', channelName);
      channel.unsubscribe();
    };
  }, [fetchProjects]);

  const createProject = async (project: Omit<Project, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("projects").insert([project]).select().single();
    if (error) throw error;
    await fetchProjects();
    return data as Project;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await fetchProjects();
    return data as Project;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    await fetchProjects();
  };

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};
