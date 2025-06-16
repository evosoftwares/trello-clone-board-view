
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
          {activity.context?.task_id && referenceData?.tasks && (
            <div className="text-xs text-gray-500 mt-1">
              Tarefa: {referenceData.tasks.find((t: any) => t.id === activity.context.task_id)?.title || 'Tarefa não encontrada'}
            </div>
          )}
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

  // Para movimento de tarefas, mostrar informações específicas
  if (activity.action_type === 'move' && activity.context) {
    const fromColumn = referenceData?.columns?.find((c: any) => c.id === activity.context.from_column)?.title || 'Coluna desconhecida';
    const toColumn = referenceData?.columns?.find((c: any) => c.id === activity.context.to_column)?.title || 'Coluna desconhecida';
    
    return (
      <div className="text-sm text-gray-600">
        <div className="font-medium">Tarefa movida</div>
        <div className="text-xs mt-1">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded mr-2">{fromColumn}</span>
          →
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded ml-2">{toColumn}</span>
        </div>
      </div>
    );
  }

  // Para outros tipos de entidade, usar a lógica existente
  if (!activity.old_data || !activity.new_data) {
    if (activity.action_type === 'create') {
      return (
        <div className="text-sm text-gray-600">
          <span>Item criado</span>
        </div>
      );
    } else if (activity.action_type === 'delete') {
      return (
        <div className="text-sm text-gray-600">
          <span>Item excluído</span>
        </div>
      );
    }
    return null;
  }

  const changes = [];
  const oldData = activity.old_data;
  const newData = activity.new_data;

  // Função auxiliar para obter nome do membro da equipe
  const getTeamMemberName = (memberId: string | null) => {
    if (!memberId) return 'Nenhum';
    return referenceData?.profiles?.[memberId] || 'Usuário desconhecido';
  };

  // Função para obter nome da coluna
  const getColumnName = (columnId: string | null) => {
    if (!columnId) return 'Nenhuma';
    return referenceData?.columns?.find((c: any) => c.id === columnId)?.title || 'Coluna desconhecida';
  };

  // Verificar mudanças comuns
  if (oldData.title !== newData.title) {
    changes.push(`Título: "${oldData.title}" → "${newData.title}"`);
  }
  if (oldData.description !== newData.description) {
    const oldDesc = oldData.description ? (oldData.description.length > 30 ? oldData.description.substring(0, 30) + '...' : oldData.description) : 'Vazia';
    const newDesc = newData.description ? (newData.description.length > 30 ? newData.description.substring(0, 30) + '...' : newData.description) : 'Vazia';
    changes.push(`Descrição: "${oldDesc}" → "${newDesc}"`);
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
    const oldColumn = getColumnName(oldData.column_id);
    const newColumn = getColumnName(newData.column_id);
    changes.push(`Coluna: ${oldColumn} → ${newColumn}`);
  }
  if (oldData.position !== newData.position && oldData.column_id === newData.column_id) {
    changes.push(`Posição alterada: ${oldData.position} → ${newData.position}`);
  }
  if (oldData.estimated_hours !== newData.estimated_hours) {
    changes.push(`Horas estimadas: ${oldData.estimated_hours || 0} → ${newData.estimated_hours || 0}`);
  }
  if (oldData.status !== newData.status) {
    changes.push(`Status: ${oldData.status} → ${newData.status}`);
  }

  if (changes.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        <span>Alteração detectada</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600">
      <ul className="list-disc list-inside space-y-1">
        {changes.slice(0, 4).map((change, index) => (
          <li key={index}>{change}</li>
        ))}
        {changes.length > 4 && (
          <li className="text-gray-500">
            +{changes.length - 4} outras alterações
          </li>
        )}
      </ul>
    </div>
  );
};
