
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/database";

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects, order by created_at desc
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setProjects([]);
    } else {
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .subscribe();
    
    return () => {
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
