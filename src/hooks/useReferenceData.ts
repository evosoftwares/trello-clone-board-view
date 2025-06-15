
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceData {
  profiles: Record<string, string>;
  projects: Record<string, string>;
  columns: Record<string, string>;
}

export const useReferenceData = () => {
  const { data: profiles = {}, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name');
      
      return data?.reduce((acc, profile) => {
        acc[profile.id] = profile.name;
        return acc;
      }, {} as Record<string, string>) || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: projects = {}, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name');
      
      return data?.reduce((acc, project) => {
        acc[project.id] = project.name;
        return acc;
      }, {} as Record<string, string>) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: columns = {}, isLoading: columnsLoading } = useQuery({
    queryKey: ['kanban_columns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('kanban_columns')
        .select('id, title');
      
      return data?.reduce((acc, column) => {
        acc[column.id] = column.title;
        return acc;
      }, {} as Record<string, string>) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    referenceData: { profiles, projects, columns },
    isLoading: profilesLoading || projectsLoading || columnsLoading,
  };
};
