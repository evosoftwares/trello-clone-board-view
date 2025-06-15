
import React from 'react';
import { ActivityLog } from '@/types/database';
import { getFieldName } from '@/utils/activityTranslations';

interface ActivityChangeDetailsProps {
  activity: ActivityLog;
  referenceData: {
    profiles: Record<string, string>;
    projects: Record<string, string>;
    columns: Record<string, string>;
  };
}

export const ActivityChangeDetails: React.FC<ActivityChangeDetailsProps> = ({ 
  activity, 
  referenceData 
}) => {
  const { profiles, projects, columns } = referenceData;

  const getUserName = (userId?: string) => {
    if (!userId) return 'Sistema';
    return profiles[userId] || `Usuário (${userId.slice(0, 8)})`;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    return projects[projectId] || `Projeto (${projectId.slice(0, 8)})`;
  };

  const getColumnName = (columnId?: string) => {
    if (!columnId) return '';
    return columns[columnId] || `Coluna (${columnId.slice(0, 8)})`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDetailedChanges = () => {
    if (!activity.old_data || !activity.new_data) {
      if (activity.action_type === 'create') {
        return 'Item criado no sistema';
      }
      if (activity.action_type === 'delete') {
        return 'Item removido do sistema';
      }
      return 'Sem detalhes de mudança disponíveis';
    }

    const changes: string[] = [];
    const oldData = activity.old_data;
    const newData = activity.new_data;

    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        const fieldName = getFieldName(key);
        
        switch (key) {
          case 'title':
          case 'name':
            changes.push(`${fieldName} alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'description':
            changes.push(`${fieldName} modificada`);
            break;
          case 'function_points':
          case 'estimated_hours':
          case 'position':
            changes.push(`${fieldName}: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'complexity':
          case 'status':
            changes.push(`${fieldName}: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'assignee':
            const oldAssignee = oldData[key] ? getUserName(oldData[key]) : 'nenhum';
            const newAssignee = newData[key] ? getUserName(newData[key]) : 'nenhum';
            changes.push(`${fieldName}: ${oldAssignee} → ${newAssignee}`);
            break;
          case 'column_id':
            const oldColumn = getColumnName(oldData[key]);
            const newColumn = getColumnName(newData[key]);
            changes.push(`Movido de "${oldColumn}" para "${newColumn}"`);
            break;
          case 'deadline':
            const oldDeadline = oldData[key] ? formatDate(oldData[key]) : 'sem prazo';
            const newDeadline = newData[key] ? formatDate(newData[key]) : 'sem prazo';
            changes.push(`${fieldName} alterado de ${oldDeadline} para ${newDeadline}`);
            break;
          case 'budget':
            changes.push(`${fieldName} alterado de R$ ${oldData[key]} para R$ ${newData[key]}`);
            break;
          case 'project_id':
            const oldProject = getProjectName(oldData[key]);
            const newProject = getProjectName(newData[key]);
            changes.push(`${fieldName} alterado de "${oldProject}" para "${newProject}"`);
            break;
          default:
            if (typeof newData[key] === 'string' || typeof newData[key] === 'number') {
              changes.push(`${fieldName}: ${oldData[key]} → ${newData[key]}`);
            }
            break;
        }
      }
    });

    return changes.length > 0 ? changes.join('; ') : 'Mudanças internas detectadas';
  };

  return (
    <div className="text-sm text-gray-700 max-w-96">
      {getDetailedChanges()}
    </div>
  );
};
