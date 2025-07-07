import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserPoints');

export interface UserPointsData {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  avatar?: string;
  total_points: number;
  total_awards: number;
  created_at: string;
  updated_at: string;
}

export interface PointAward {
  id: string;
  user_id: string;
  user_name: string;
  task_id: string;
  task_title: string;
  points_awarded: number;
  task_complexity: string;
  awarded_at: string;
  from_column_name?: string;
  to_column_name: string;
  project_name?: string;
  project_color?: string;
}

export const useUserPoints = () => {
  const [userPoints, setUserPoints] = useState<UserPointsData[]>([]);
  const [pointAwards, setPointAwards] = useState<PointAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSystemAvailable, setIsSystemAvailable] = useState(false);

  const fetchUserPoints = async () => {
    try {
      logger.info('Fetching user points data');
      
      // Test if the points system is available
      const { data: systemCheck, error: systemError } = await supabase
        .from('user_points')
        .select('id')
        .limit(1);
      
      if (systemError) {
        if (systemError.message.includes('does not exist')) {
          logger.warn('Points system not available - tables do not exist');
          setIsSystemAvailable(false);
          setError('Sistema de pontos não está ativado');
          return;
        }
        throw systemError;
      }
      
      setIsSystemAvailable(true);
      
      // Calculate points in real-time from current task state
      // Get users from both profiles and team_members tables
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar');
      
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, name, email, avatar');
      
      if (profilesError && teamMembersError) {
        logger.error('Error fetching users', { profilesError, teamMembersError });
        throw profilesError || teamMembersError;
      }
      
      // Combine users from both tables, avoiding duplicates
      const allUsers = [
        ...(profiles || []),
        ...(teamMembers || []).filter(tm => 
          !(profiles || []).some(p => p.id === tm.id)
        )
      ];
      
      const userPointsCalculated = [];
      
      for (const user of allUsers || []) {
        // Get all tasks for this user
        const { data: userTasks, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            function_points,
            kanban_columns!inner(title)
          `)
          .eq('assignee', user.id)
          .gt('function_points', 0);
        
        if (tasksError) {
          logger.error(`Error fetching tasks for user ${user.id}`, tasksError);
          continue;
        }
        
        // Calculate points from completed tasks
        const totalPoints = userTasks?.reduce((total, task) => {
          const columnTitle = task.kanban_columns?.title?.toLowerCase() || '';
          const isCompleted = (
            columnTitle.includes('concluído') ||
            columnTitle.includes('concluido') ||
            columnTitle.includes('completed') ||
            columnTitle.includes('done') ||
            columnTitle.includes('sucesso') ||
            columnTitle.includes('success')
          );
          
          return total + (isCompleted ? (task.function_points || 0) : 0);
        }, 0) || 0;
        
        const completedTasksCount = userTasks?.filter(task => {
          const columnTitle = task.kanban_columns?.title?.toLowerCase() || '';
          return (
            columnTitle.includes('concluído') ||
            columnTitle.includes('concluido') ||
            columnTitle.includes('completed') ||
            columnTitle.includes('done') ||
            columnTitle.includes('sucesso') ||
            columnTitle.includes('success')
          );
        }).length || 0;
        
        userPointsCalculated.push({
          id: user.id,
          user_id: user.id,
          user_name: user.name,
          email: user.email,
          avatar: user.avatar,
          total_points: totalPoints,
          total_awards: completedTasksCount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Sort by total points descending
      userPointsCalculated.sort((a, b) => b.total_points - a.total_points);
      
      setUserPoints(userPointsCalculated);
      logger.info('User points calculated in real-time', userPointsCalculated.length);
      
      // Fetch recent point awards
      const { data: awardsData, error: awardsError } = await supabase
        .from('user_point_awards_detailed')
        .select('*')
        .order('awarded_at', { ascending: false })
        .limit(50);
      
      if (awardsError) {
        logger.error('Error fetching point awards', awardsError);
        throw awardsError;
      }
      
      setPointAwards(awardsData || []);
      logger.info('Point awards fetched successfully', awardsData?.length);
      
    } catch (err: any) {
      logger.error('Error in fetchUserPoints', err);
      setError(err.message || 'Erro ao buscar dados de pontos');
    } finally {
      setLoading(false);
    }
  };

  const getUserPoints = async (userId: string): Promise<UserPointsData | null> => {
    try {
      if (!isSystemAvailable) return null;
      
      // Get user info
      let user = null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, avatar')
        .eq('id', userId)
        .single();
      
      if (profile) {
        user = profile;
      } else {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id, name, email, avatar')
          .eq('id', userId)
          .single();
        user = teamMember;
      }
      
      if (!user) return null;
      
      // Calculate points from completed tasks
      const { data: userTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          function_points,
          kanban_columns!inner(title)
        `)
        .eq('assignee', userId)
        .gt('function_points', 0);
      
      if (tasksError) {
        logger.error('Error fetching user tasks', tasksError);
        return null;
      }
      
      const totalPoints = userTasks?.reduce((total, task) => {
        const columnTitle = task.kanban_columns?.title?.toLowerCase() || '';
        const isCompleted = (
          columnTitle.includes('concluído') ||
          columnTitle.includes('concluido') ||
          columnTitle.includes('completed') ||
          columnTitle.includes('done') ||
          columnTitle.includes('sucesso') ||
          columnTitle.includes('success')
        );
        
        return total + (isCompleted ? (task.function_points || 0) : 0);
      }, 0) || 0;
      
      const completedTasksCount = userTasks?.filter(task => {
        const columnTitle = task.kanban_columns?.title?.toLowerCase() || '';
        return (
          columnTitle.includes('concluído') ||
          columnTitle.includes('concluido') ||
          columnTitle.includes('completed') ||
          columnTitle.includes('done') ||
          columnTitle.includes('sucesso') ||
          columnTitle.includes('success')
        );
      }).length || 0;
      
      return {
        id: user.id,
        user_id: user.id,
        user_name: user.name,
        email: user.email,
        avatar: user.avatar,
        total_points: totalPoints,
        total_awards: completedTasksCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (err: any) {
      logger.error('Error fetching user points', err);
      return null;
    }
  };

  const getUserAwards = async (userId: string): Promise<PointAward[]> => {
    try {
      if (!isSystemAvailable) return [];
      
      const { data, error } = await supabase
        .from('user_point_awards_detailed')
        .select('*')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (err: any) {
      logger.error('Error fetching user awards', err);
      return [];
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSystemAvailable) return;
    
    const pointsSubscription = supabase
      .channel('user_points_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_points' },
        () => {
          logger.info('User points updated, refreshing data');
          fetchUserPoints();
        }
      )
      .subscribe();
    
    const awardsSubscription = supabase
      .channel('user_point_awards_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_point_awards' },
        () => {
          logger.info('Point awards updated, refreshing data');
          fetchUserPoints();
        }
      )
      .subscribe();
    
    return () => {
      pointsSubscription.unsubscribe();
      awardsSubscription.unsubscribe();
    };
  }, [isSystemAvailable]);

  // Initial load
  useEffect(() => {
    fetchUserPoints();
  }, []);

  return {
    userPoints,
    pointAwards,
    loading,
    error,
    isSystemAvailable,
    refreshData: fetchUserPoints,
    getUserPoints,
    getUserAwards
  };
};