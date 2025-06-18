import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/database";
import { useActivityLogger } from "./useActivityLogger";

// DEBUG: Add logging to track subscription lifecycle
console.debug('[PROJECT DATA] Hook loaded - checking for subscription issues');

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logProjectActivity } = useActivityLogger();

  // Fetch all projects, order by created_at desc
  const fetchProjects = useCallback(async () => {
    console.debug('[PROJECT DATA] Fetching projects...');
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('[PROJECT DATA] Error fetching projects:', error);
      setError(error.message);
      setProjects([]);
    } else {
      console.debug('[PROJECT DATA] Projects fetched successfully:', data?.length);
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    
    // Create a unique channel name to avoid conflicts
    const channelName = `projects-realtime-${Math.random().toString(36).substr(2, 9)}`;
    console.debug('[PROJECT DATA] Creating channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        console.debug('[PROJECT DATA] Realtime update received:', payload);
        fetchProjects();
      })
      .subscribe((status) => {
        console.debug('[PROJECT DATA] Channel subscription status:', status);
      });
    
    return () => {
      console.debug('[PROJECT DATA] Cleaning up channel:', channelName);
      channel.unsubscribe();
    };
  }, [fetchProjects]);

  const createProject = async (project: Omit<Project, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase.from("projects").insert([project]).select().single();
    if (error) throw error;
    
    // Log activity
    await logProjectActivity(data.id, 'create', null, data);
    
    await fetchProjects();
    return data as Project;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    // Get old data for logging
    const { data: oldProject } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;

    // Log activity
    await logProjectActivity(id, 'update', oldProject, data);
    
    await fetchProjects();
    return data as Project;
  };

  const deleteProject = async (id: string) => {
    // Get old data for logging
    const { data: oldProject } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;

    // Log activity
    await logProjectActivity(id, 'delete', oldProject, null);
    
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
