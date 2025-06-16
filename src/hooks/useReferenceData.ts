
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceData {
  profiles: Record<string, string>; // user_id -> name
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  tasks: Array<{ id: string; title: string }>;
  projects: Array<{ id: string; name: string }>;
  columns: Array<{ id: string; title: string }>;
  tags: Array<{ id: string; name: string }>;
}

export const useReferenceData = () => {
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    profiles: {},
    teamMembers: [],
    tasks: [],
    projects: [],
    columns: [],
    tags: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setIsLoading(true);
        console.log('[REFERENCE DATA] Fetching reference data...');

        // Buscar todos os dados em paralelo
        const [
          profilesResult,
          teamMembersResult,
          tasksResult,
          projectsResult,
          columnsResult,
          tagsResult
        ] = await Promise.all([
          supabase.from('profiles').select('id, name, email'),
          supabase.from('team_members').select('id, name, email'),
          supabase.from('tasks').select('id, title'),
          supabase.from('projects').select('id, name'),
          supabase.from('kanban_columns').select('id, title'),
          supabase.from('tags').select('id, name')
        ]);

        // Verificar erros
        const errors = [
          profilesResult.error,
          teamMembersResult.error, 
          tasksResult.error,
          projectsResult.error,
          columnsResult.error,
          tagsResult.error
        ].filter(Boolean);

        if (errors.length > 0) {
          console.error('[REFERENCE DATA] Errors found:', errors);
          throw new Error(`Erro ao buscar dados: ${errors[0]?.message}`);
        }

        // Criar mapa de profiles (user_id -> name)
        const profilesMap = (profilesResult.data || []).reduce((acc, profile) => {
          acc[profile.id] = profile.name || profile.email || 'Usuário';
          return acc;
        }, {} as Record<string, string>);

        // Adicionar team_members ao mapa de profiles também
        (teamMembersResult.data || []).forEach(member => {
          if (!profilesMap[member.id]) {
            profilesMap[member.id] = member.name || member.email || 'Membro';
          }
        });

        const newReferenceData: ReferenceData = {
          profiles: profilesMap,
          teamMembers: teamMembersResult.data || [],
          tasks: tasksResult.data || [],
          projects: projectsResult.data || [],
          columns: columnsResult.data || [],
          tags: tagsResult.data || []
        };

        console.log('[REFERENCE DATA] Data loaded:', {
          profiles: Object.keys(newReferenceData.profiles).length,
          teamMembers: newReferenceData.teamMembers.length,
          tasks: newReferenceData.tasks.length,
          projects: newReferenceData.projects.length,
          columns: newReferenceData.columns.length,
          tags: newReferenceData.tags.length
        });

        setReferenceData(newReferenceData);
        setError(null);
      } catch (err: any) {
        console.error('[REFERENCE DATA] Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferenceData();
  }, []);

  return { referenceData, isLoading, error };
};
