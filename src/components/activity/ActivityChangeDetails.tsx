
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
    return profiles[userId] || `Usuário não identificado`;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    return projects[projectId] || `Projeto não encontrado`;
  };

  const getColumnName = (columnId?: string) => {
    if (!columnId) return '';
    return columns[columnId] || `Coluna não encontrada`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: any) => {
    if (!value) return 'sem valor definido';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const getDetailedChanges = () => {
    if (!activity.old_data || !activity.new_data) {
      if (activity.action_type === 'create') {
        return 'Um novo item foi criado no sistema';
      }
      if (activity.action_type === 'delete') {
        return 'Este item foi removido permanentemente';
      }
      return 'Houve uma alteração no sistema';
    }

    const changes: string[] = [];
    const oldData = activity.old_data;
    const newData = activity.new_data;

    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        switch (key) {
          case 'title':
            changes.push(`📝 O título foi alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'name':
            changes.push(`📝 O nome foi alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'description':
            if (!oldData[key] && newData[key]) {
              changes.push('📄 Uma descrição foi adicionada ao item');
            } else if (oldData[key] && !newData[key]) {
              changes.push('📄 A descrição foi removida');
            } else {
              changes.push('📄 A descrição foi modificada');
            }
            break;
          case 'function_points':
            const oldPoints = oldData[key] || 0;
            const newPoints = newData[key] || 0;
            const diff = newPoints - oldPoints;
            
            if (diff > 0) {
              changes.push(`📊 Os pontos de função aumentaram de ${oldPoints} para ${newPoints} (+${diff} pontos)`);
            } else if (diff < 0) {
              changes.push(`📊 Os pontos de função diminuíram de ${oldPoints} para ${newPoints} (${diff} pontos)`);
            }
            break;
          case 'estimated_hours':
            const oldHours = oldData[key] || 0;
            const newHours = newData[key] || 0;
            
            if (oldHours === 0 && newHours > 0) {
              changes.push(`⏱️ Estimativa de tempo definida em ${newHours} horas`);
            } else if (oldHours > 0 && newHours === 0) {
              changes.push('⏱️ A estimativa de tempo foi removida');
            } else if (oldHours !== newHours) {
              const diff = newHours - oldHours;
              const action = diff > 0 ? 'aumentou' : 'diminuiu';
              changes.push(`⏱️ A estimativa ${action} de ${oldHours}h para ${newHours}h`);
            }
            break;
          case 'complexity':
            const complexityMap: Record<string, string> = {
              'low': 'Simples',
              'medium': 'Moderada',
              'high': 'Complexa',
              'very_high': 'Muito Complexa'
            };
            const oldComplexity = complexityMap[oldData[key]] || oldData[key];
            const newComplexity = complexityMap[newData[key]] || newData[key];
            changes.push(`🎯 A complexidade mudou de "${oldComplexity}" para "${newComplexity}"`);
            break;
          case 'status':
            const statusMap: Record<string, string> = {
              'todo': 'Para Fazer',
              'in_progress': 'Em Desenvolvimento',
              'review': 'Em Revisão',
              'done': 'Finalizado'
            };
            const oldStatus = statusMap[oldData[key]] || oldData[key];
            const newStatus = statusMap[newData[key]] || newData[key];
            changes.push(`🔄 O status mudou de "${oldStatus}" para "${newStatus}"`);
            break;
          case 'assignee':
            const oldAssignee = oldData[key] ? getUserName(oldData[key]) : null;
            const newAssignee = newData[key] ? getUserName(newData[key]) : null;
            
            if (!oldAssignee && newAssignee) {
              changes.push(`👤 ${newAssignee} foi designado(a) como responsável`);
            } else if (oldAssignee && !newAssignee) {
              changes.push(`👤 ${oldAssignee} foi removido(a) da responsabilidade`);
            } else if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
              changes.push(`👤 A responsabilidade foi transferida de ${oldAssignee} para ${newAssignee}`);
            }
            break;
          case 'column_id':
            const oldColumn = getColumnName(oldData[key]);
            const newColumn = getColumnName(newData[key]);
            changes.push(`↔️ Movido da coluna "${oldColumn}" para "${newColumn}"`);
            break;
          case 'deadline':
            const oldDeadline = oldData[key] ? formatDate(oldData[key]) : null;
            const newDeadline = newData[key] ? formatDate(newData[key]) : null;
            
            if (!oldDeadline && newDeadline) {
              changes.push(`📅 Prazo definido para ${newDeadline}`);
            } else if (oldDeadline && !newDeadline) {
              changes.push('📅 O prazo foi removido');
            } else if (oldDeadline && newDeadline && oldDeadline !== newDeadline) {
              changes.push(`📅 O prazo foi alterado de ${oldDeadline} para ${newDeadline}`);
            }
            break;
          case 'budget':
            const oldBudget = formatCurrency(oldData[key]);
            const newBudget = formatCurrency(newData[key]);
            changes.push(`💰 O orçamento foi alterado de ${oldBudget} para ${newBudget}`);
            break;
          case 'project_id':
            const oldProject = getProjectName(oldData[key]);
            const newProject = getProjectName(newData[key]);
            
            if (!oldData[key] && newData[key]) {
              changes.push(`🏗️ Associado ao projeto "${newProject}"`);
            } else if (oldData[key] && !newData[key]) {
              changes.push(`🏗️ Removido do projeto "${oldProject}"`);
            } else if (oldProject !== newProject) {
              changes.push(`🏗️ Transferido do projeto "${oldProject}" para "${newProject}"`);
            }
            break;
          case 'client_name':
            changes.push(`🏢 Cliente alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'start_date':
            const oldStart = oldData[key] ? formatDate(oldData[key]) : null;
            const newStart = newData[key] ? formatDate(newData[key]) : null;
            
            if (!oldStart && newStart) {
              changes.push(`🚀 Data de início definida para ${newStart}`);
            } else if (oldStart && !newStart) {
              changes.push('🚀 Data de início foi removida');
            } else if (oldStart !== newStart) {
              changes.push(`🚀 Data de início alterada de ${oldStart} para ${newStart}`);
            }
            break;
          case 'role':
            const roleMap: Record<string, string> = {
              'admin': 'Administrador',
              'manager': 'Gerente',
              'developer': 'Desenvolvedor',
              'designer': 'Designer',
              'tester': 'Testador',
              'analyst': 'Analista'
            };
            const oldRole = roleMap[oldData[key]] || oldData[key];
            const newRole = roleMap[newData[key]] || newData[key];
            changes.push(`👔 Função alterada de "${oldRole}" para "${newRole}"`);
            break;
          case 'email':
            changes.push(`📧 Email alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'is_active':
            const oldActive = oldData[key] ? 'ativo' : 'inativo';
            const newActive = newData[key] ? 'ativo' : 'inativo';
            changes.push(`🔘 Status alterado de "${oldActive}" para "${newActive}"`);
            break;
          case 'color':
            changes.push(`🎨 Cor personalizada foi alterada`);
            break;
          case 'position':
            // Não mostrar mudanças de posição pois são muito técnicas
            break;
          case 'created_at':
          case 'updated_at':
          case 'id':
            // Ignorar campos técnicos
            break;
          default:
            // Para outros campos, usar uma descrição genérica mais humana
            const fieldName = getFieldName(key).toLowerCase();
            changes.push(`✏️ O campo "${fieldName}" foi atualizado`);
            break;
        }
      }
    });

    if (changes.length === 0) {
      return 'Houve uma atualização interna no sistema';
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
