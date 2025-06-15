
import { useAuth } from '@/contexts/AuthContext';

export const useUserPermissions = () => {
  const { user, profile } = useAuth();

  const canModifyTask = (taskAssignee?: string | null) => {
    if (!user || !profile) return false;
    
    // Admin pode modificar qualquer tarefa
    if (profile.role === 'admin' || profile.role === 'manager') {
      return true;
    }
    
    // Usuário pode modificar tarefas não atribuídas ou suas próprias
    return !taskAssignee || taskAssignee === user.id;
  };

  const canDeleteTask = (taskAssignee?: string | null) => {
    if (!user || !profile) return false;
    
    // Apenas admin/manager podem excluir tarefas
    if (profile.role === 'admin' || profile.role === 'manager') {
      return true;
    }
    
    return false;
  };

  const canCreateProject = () => {
    if (!profile) return false;
    
    // Apenas admin/manager podem criar projetos
    return profile.role === 'admin' || profile.role === 'manager';
  };

  const canViewAllTasks = () => {
    if (!profile) return false;
    
    // Admin/manager podem ver todas as tarefas
    return profile.role === 'admin' || profile.role === 'manager';
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const isManager = () => {
    return profile?.role === 'manager' || profile?.role === 'admin';
  };

  return {
    canModifyTask,
    canDeleteTask,
    canCreateProject,
    canViewAllTasks,
    isAdmin,
    isManager,
    currentUser: user,
    currentProfile: profile
  };
};
