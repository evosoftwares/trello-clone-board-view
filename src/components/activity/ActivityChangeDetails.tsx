
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

  const formatCurrency = (value: any) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const getDetailedChanges = () => {
    if (!activity.old_data || !activity.new_data) {
      if (activity.action_type === 'create') {
        return 'Item foi criado no sistema';
      }
      if (activity.action_type === 'delete') {
        return 'Item foi removido do sistema';
      }
      return 'Alteração realizada no sistema';
    }

    const changes: string[] = [];
    const oldData = activity.old_data;
    const newData = activity.new_data;

    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        switch (key) {
          case 'title':
            changes.push(`O título foi alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'name':
            changes.push(`O nome foi alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'description':
            if (!oldData[key] && newData[key]) {
              changes.push('Uma descrição foi adicionada');
            } else if (oldData[key] && !newData[key]) {
              changes.push('A descrição foi removida');
            } else {
              changes.push('A descrição foi modificada');
            }
            break;
          case 'function_points':
            const oldPoints = oldData[key] || 0;
            const newPoints = newData[key] || 0;
            const diff = newPoints - oldPoints;
            const action = diff > 0 ? 'aumentou' : 'diminuiu';
            const diffText = Math.abs(diff) === 1 ? '1 ponto' : `${Math.abs(diff)} pontos`;
            changes.push(`Os pontos de função ${action}ram de ${oldPoints} para ${newPoints} (${action === 'aumentou' ? '+' : '-'}${Math.abs(diff)} ${diffText.includes('1 ponto') ? 'ponto' : 'pontos'})`);
            break;
          case 'estimated_hours':
            const oldHours = oldData[key] || 0;
            const newHours = newData[key] || 0;
            if (oldHours === 0 && newHours > 0) {
              changes.push(`Estimativa de ${newHours}h foi adicionada`);
            } else if (oldHours > 0 && newHours === 0) {
              changes.push('A estimativa de horas foi removida');
            } else {
              changes.push(`A estimativa foi alterada de ${oldHours}h para ${newHours}h`);
            }
            break;
          case 'complexity':
            const complexityMap: Record<string, string> = {
              'low': 'Baixa',
              'medium': 'Média',
              'high': 'Alta',
              'very_high': 'Muito Alta'
            };
            const oldComplexity = complexityMap[oldData[key]] || oldData[key];
            const newComplexity = complexityMap[newData[key]] || newData[key];
            changes.push(`A complexidade mudou de "${oldComplexity}" para "${newComplexity}"`);
            break;
          case 'status':
            const statusMap: Record<string, string> = {
              'todo': 'A Fazer',
              'in_progress': 'Em Andamento',
              'review': 'Em Revisão',
              'done': 'Concluído'
            };
            const oldStatus = statusMap[oldData[key]] || oldData[key];
            const newStatus = statusMap[newData[key]] || newData[key];
            changes.push(`O status mudou de "${oldStatus}" para "${newStatus}"`);
            break;
          case 'assignee':
            const oldAssignee = oldData[key] ? getUserName(oldData[key]) : null;
            const newAssignee = newData[key] ? getUserName(newData[key]) : null;
            
            if (!oldAssignee && newAssignee) {
              changes.push(`${newAssignee} foi atribuído(a) como responsável`);
            } else if (oldAssignee && !newAssignee) {
              changes.push(`${oldAssignee} foi removido(a) como responsável`);
            } else if (oldAssignee && newAssignee) {
              changes.push(`A responsabilidade foi transferida de ${oldAssignee} para ${newAssignee}`);
            }
            break;
          case 'column_id':
            const oldColumn = getColumnName(oldData[key]);
            const newColumn = getColumnName(newData[key]);
            changes.push(`Foi movido da coluna "${oldColumn}" para "${newColumn}"`);
            break;
          case 'position':
            // Não mostrar mudanças de posição pois são muito técnicas
            break;
          case 'deadline':
            const oldDeadline = oldData[key] ? formatDate(oldData[key]) : null;
            const newDeadline = newData[key] ? formatDate(newData[key]) : null;
            
            if (!oldDeadline && newDeadline) {
              changes.push(`Prazo definido para ${newDeadline}`);
            } else if (oldDeadline && !newDeadline) {
              changes.push('O prazo foi removido');
            } else if (oldDeadline && newDeadline) {
              changes.push(`O prazo foi alterado de ${oldDeadline} para ${newDeadline}`);
            }
            break;
          case 'budget':
            const oldBudget = formatCurrency(oldData[key]);
            const newBudget = formatCurrency(newData[key]);
            changes.push(`O orçamento foi alterado de ${oldBudget} para ${newBudget}`);
            break;
          case 'project_id':
            const oldProject = getProjectName(oldData[key]);
            const newProject = getProjectName(newData[key]);
            if (!oldData[key] && newData[key]) {
              changes.push(`Foi associado ao projeto "${newProject}"`);
            } else if (oldData[key] && !newData[key]) {
              changes.push(`Foi removido do projeto "${oldProject}"`);
            } else {
              changes.push(`Foi movido do projeto "${oldProject}" para "${newProject}"`);
            }
            break;
          case 'created_at':
          case 'updated_at':
          case 'id':
            // Ignorar campos técnicos
            break;
          default:
            // Para outros campos, usar uma descrição genérica mais humana
            const fieldName = getFieldName(key).toLowerCase();
            changes.push(`O campo "${fieldName}" foi atualizado`);
            break;
        }
      }
    });

    if (changes.length === 0) {
      return 'Alteração interna realizada no sistema';
    } else if (changes.length === 1) {
      return changes[0];
    } else if (changes.length === 2) {
      return changes.join(' e ');
    } else {
      const lastChange = changes.pop();
      return `${changes.join(', ')} e ${lastChange}`;
    }
  };

  return (
    <div className="text-sm text-gray-700 max-w-96 leading-relaxed">
      {getDetailedChanges()}
    </div>
  );
};
