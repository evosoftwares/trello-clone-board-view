
import React from 'react';
import { ActivityLog } from '@/types/database';

interface ActivityChangeDetailsProps {
  activity: ActivityLog;
  referenceData?: any;
}

export const ActivityChangeDetails: React.FC<ActivityChangeDetailsProps> = ({ 
  activity, 
  referenceData 
}) => {
  // Para comentários, mostrar informações específicas
  if (activity.entity_type === 'task_comment') {
    if (activity.action_type === 'create') {
      return (
        <div className="text-sm text-gray-600">
          <span>Novo comentário adicionado</span>
        </div>
      );
    } else if (activity.action_type === 'delete') {
      return (
        <div className="text-sm text-gray-600">
          <span>Comentário removido</span>
        </div>
      );
    } else if (activity.action_type === 'update') {
      return (
        <div className="text-sm text-gray-600">
          <span>Comentário editado</span>
        </div>
      );
    }
  }

  // Para outros tipos de entidade, usar a lógica existente
  if (!activity.old_data || !activity.new_data) {
    return null;
  }

  const changes = [];
  const oldData = activity.old_data;
  const newData = activity.new_data;

  // Função auxiliar para obter nome do membro da equipe
  const getTeamMemberName = (memberId: string | null) => {
    if (!memberId || !referenceData?.teamMembers) return 'Nenhum';
    const member = referenceData.teamMembers.find((m: any) => m.id === memberId);
    return member ? member.name : memberId;
  };

  // Verificar mudanças comuns
  if (oldData.title !== newData.title) {
    changes.push(`Título: "${oldData.title}" → "${newData.title}"`);
  }
  if (oldData.description !== newData.description) {
    changes.push(`Descrição alterada`);
  }
  if (oldData.function_points !== newData.function_points) {
    changes.push(`Pontos de função: ${oldData.function_points || 0} → ${newData.function_points || 0}`);
  }
  if (oldData.complexity !== newData.complexity) {
    const complexityMap: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média', 
      high: 'Alta'
    };
    const oldComplexity = complexityMap[oldData.complexity] || oldData.complexity;
    const newComplexity = complexityMap[newData.complexity] || newData.complexity;
    changes.push(`Complexidade: ${oldComplexity} → ${newComplexity}`);
  }
  if (oldData.assignee !== newData.assignee) {
    const oldAssignee = getTeamMemberName(oldData.assignee);
    const newAssignee = getTeamMemberName(newData.assignee);
    changes.push(`Responsável: ${oldAssignee} → ${newAssignee}`);
  }
  if (oldData.column_id !== newData.column_id) {
    changes.push(`Coluna alterada`);
  }
  if (oldData.position !== newData.position) {
    changes.push(`Posição: ${oldData.position} → ${newData.position}`);
  }
  if (oldData.estimated_hours !== newData.estimated_hours) {
    changes.push(`Horas estimadas: ${oldData.estimated_hours || 0} → ${newData.estimated_hours || 0}`);
  }

  if (changes.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        <span>Sem alterações detectadas</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600">
      <ul className="list-disc list-inside space-y-1">
        {changes.slice(0, 3).map((change, index) => (
          <li key={index}>{change}</li>
        ))}
        {changes.length > 3 && (
          <li className="text-gray-500">
            +{changes.length - 3} outras alterações
          </li>
        )}
      </ul>
    </div>
  );
};
