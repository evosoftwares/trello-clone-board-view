
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
      const content = activity.new_data?.content || '';
      const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
      return (
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium text-blue-700">Comentário Adicionado</div>
          <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-200">
            <div className="text-xs text-gray-500 mb-1">Conteúdo:</div>
            <div className="text-sm">"{contentPreview}"</div>
          </div>
          {activity.context?.task_id && referenceData?.tasks && (
            <div className="text-xs text-gray-500">
              <strong>Tarefa ID:</strong> {activity.context.task_id.slice(0, 8)}...
              <br />
              <strong>Tarefa:</strong> {referenceData.tasks.find((t: any) => t.id === activity.context.task_id)?.title || 'Não encontrada'}
            </div>
          )}
          <div className="text-xs text-gray-500">
            <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
            <br />
            <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
          </div>
        </div>
      );
    } else if (activity.action_type === 'delete') {
      return (
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium text-red-700">Comentário Removido</div>
          <div className="bg-red-50 p-2 rounded border-l-4 border-red-200">
            <div className="text-xs text-gray-500">Dados removidos do sistema</div>
          </div>
          <div className="text-xs text-gray-500">
            <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
            <br />
            <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
          </div>
        </div>
      );
    } else if (activity.action_type === 'update') {
      const oldContent = activity.old_data?.content || '';
      const newContent = activity.new_data?.content || '';
      return (
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium text-orange-700">Comentário Editado</div>
          <div className="bg-orange-50 p-2 rounded border-l-4 border-orange-200 space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Conteúdo Anterior:</div>
              <div className="text-sm bg-red-100 p-1 rounded">"{oldContent.substring(0, 80)}..."</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Novo Conteúdo:</div>
              <div className="text-sm bg-green-100 p-1 rounded">"{newContent.substring(0, 80)}..."</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
            <br />
            <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
          </div>
        </div>
      );
    }
  }

  // Para movimento de tarefas, mostrar informações técnicas específicas
  if (activity.action_type === 'move' && activity.context) {
    const fromColumnId = activity.context.from_column;
    const toColumnId = activity.context.to_column;
    const fromColumn = referenceData?.columns?.find((c: any) => c.id === fromColumnId)?.title || 'Coluna desconhecida';
    const toColumn = referenceData?.columns?.find((c: any) => c.id === toColumnId)?.title || 'Coluna desconhecida';
    
    return (
      <div className="text-sm text-gray-600 space-y-2">
        <div className="font-medium text-purple-700">Movimentação de Tarefa</div>
        <div className="bg-purple-50 p-2 rounded border-l-4 border-purple-200 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">{fromColumn}</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">{toColumn}</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>From Column ID:</strong> {fromColumnId?.slice(0, 8)}...</div>
            <div><strong>To Column ID:</strong> {toColumnId?.slice(0, 8)}...</div>
            {activity.context.from_position !== undefined && (
              <div><strong>From Position:</strong> {activity.context.from_position}</div>
            )}
            {activity.context.to_position !== undefined && (
              <div><strong>To Position:</strong> {activity.context.to_position}</div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
          <br />
          <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
        </div>
      </div>
    );
  }

  // Para outros tipos de entidade, usar a lógica aprimorada
  if (!activity.old_data || !activity.new_data) {
    if (activity.action_type === 'create') {
      return (
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium text-green-700">Item Criado</div>
          <div className="bg-green-50 p-2 rounded border-l-4 border-green-200">
            <div className="text-xs text-gray-500 mb-2">Dados criados:</div>
            <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
              <pre>{JSON.stringify(activity.new_data, null, 2)}</pre>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <strong>Entity Type:</strong> {activity.entity_type}
            <br />
            <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
            <br />
            <strong>User ID:</strong> {activity.user_id?.slice(0, 8)}... 
            <br />
            <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
          </div>
        </div>
      );
    } else if (activity.action_type === 'delete') {
      return (
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium text-red-700">Item Excluído</div>
          <div className="bg-red-50 p-2 rounded border-l-4 border-red-200">
            <div className="text-xs text-gray-500 mb-2">Dados removidos:</div>
            <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
              <pre>{JSON.stringify(activity.old_data, null, 2)}</pre>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <strong>Entity Type:</strong> {activity.entity_type}
            <br />
            <strong>Entity ID:</strong> {activity.entity_id.slice(0, 8)}...
            <br />
            <strong>User ID:</strong> {activity.user_id?.slice(0, 8)}...
            <br />
            <strong>Timestamp:</strong> {new Date(activity.created_at).toISOString()}
          </div>
        </div>
      );
    }
    return null;
  }

  const changes = [];
  const oldData = activity.old_data;
  const newData = activity.new_data;
  const technicalDetails = [];

  // Função auxiliar para obter nome do membro da equipe
  const getTeamMemberName = (memberId: string | null) => {
    if (!memberId) return 'Nenhum';
    const memberName = referenceData?.profiles?.[memberId];
    return memberName ? `${memberName} (${memberId.slice(0, 8)}...)` : `ID: ${memberId.slice(0, 8)}...`;
  };

  // Função para obter nome da coluna
  const getColumnName = (columnId: string | null) => {
    if (!columnId) return 'Nenhuma';
    const column = referenceData?.columns?.find((c: any) => c.id === columnId);
    return column ? `${column.title} (${columnId.slice(0, 8)}...)` : `ID: ${columnId.slice(0, 8)}...`;
  };

  // Verificar mudanças comuns com mais detalhes técnicos
  if (oldData.title !== newData.title) {
    changes.push({
      field: 'title',
      old: oldData.title,
      new: newData.title,
      type: 'string'
    });
  }
  if (oldData.description !== newData.description) {
    changes.push({
      field: 'description',
      old: oldData.description || '[empty]',
      new: newData.description || '[empty]',
      type: 'text'
    });
  }
  if (oldData.function_points !== newData.function_points) {
    changes.push({
      field: 'function_points',
      old: oldData.function_points || 0,
      new: newData.function_points || 0,
      type: 'integer'
    });
  }
  if (oldData.complexity !== newData.complexity) {
    const complexityMap: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média', 
      high: 'Alta'
    };
    changes.push({
      field: 'complexity',
      old: `${complexityMap[oldData.complexity] || oldData.complexity} (${oldData.complexity})`,
      new: `${complexityMap[newData.complexity] || newData.complexity} (${newData.complexity})`,
      type: 'enum'
    });
  }
  if (oldData.assignee !== newData.assignee) {
    changes.push({
      field: 'assignee',
      old: getTeamMemberName(oldData.assignee),
      new: getTeamMemberName(newData.assignee),
      type: 'uuid'
    });
  }
  if (oldData.column_id !== newData.column_id) {
    changes.push({
      field: 'column_id',
      old: getColumnName(oldData.column_id),
      new: getColumnName(newData.column_id),
      type: 'uuid'
    });
  }
  if (oldData.position !== newData.position && oldData.column_id === newData.column_id) {
    changes.push({
      field: 'position',
      old: oldData.position,
      new: newData.position,
      type: 'integer'
    });
  }
  if (oldData.estimated_hours !== newData.estimated_hours) {
    changes.push({
      field: 'estimated_hours',
      old: oldData.estimated_hours || 0,
      new: newData.estimated_hours || 0,
      type: 'numeric'
    });
  }
  if (oldData.status !== newData.status) {
    changes.push({
      field: 'status',
      old: oldData.status,
      new: newData.status,  
      type: 'string'
    });
  }
  if (oldData.project_id !== newData.project_id) {
    const oldProject = referenceData?.projects?.find((p: any) => p.id === oldData.project_id);
    const newProject = referenceData?.projects?.find((p: any) => p.id === newData.project_id);
    changes.push({
      field: 'project_id',
      old: oldProject ? `${oldProject.name} (${oldData.project_id?.slice(0, 8)}...)` : oldData.project_id?.slice(0, 8) + '...' || '[null]',
      new: newProject ? `${newProject.name} (${newData.project_id?.slice(0, 8)}...)` : newData.project_id?.slice(0, 8) + '...' || '[null]',
      type: 'uuid'
    });
  }

  // Adicionar detalhes técnicos
  technicalDetails.push(`Entity Type: ${activity.entity_type}`);
  technicalDetails.push(`Entity ID: ${activity.entity_id.slice(0, 8)}...`);
  technicalDetails.push(`Action Type: ${activity.action_type}`);
  technicalDetails.push(`User ID: ${activity.user_id?.slice(0, 8)}...`);
  technicalDetails.push(`Timestamp: ${new Date(activity.created_at).toISOString()}`);
  if (activity.context) {
    technicalDetails.push(`Context: ${JSON.stringify(activity.context)}`);
  }

  if (changes.length === 0) {
    return (
      <div className="text-sm text-gray-600 space-y-2">
        <div className="font-medium text-gray-700">Alteração Detectada</div>
        <div className="bg-gray-50 p-2 rounded border-l-4 border-gray-200">
          <div className="text-xs text-gray-500">Nenhuma mudança específica identificada nos campos monitorados</div>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          {technicalDetails.map((detail, index) => (
            <div key={index}>{detail}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600 space-y-3">
      <div className="font-medium text-blue-700">Alterações Detectadas ({changes.length})</div>
      
      {/* Mostrar mudanças em formato estruturado */}
      <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-200 space-y-3">
        {changes.slice(0, 6).map((change, index) => (
          <div key={index} className="bg-white p-2 rounded border">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                {change.field}
              </span>
              <span className="text-xs text-gray-500">({change.type})</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Anterior:</div>
                <div className="bg-red-50 p-1 rounded font-mono text-red-700 break-all">
                  {typeof change.old === 'string' && change.old.length > 50 
                    ? change.old.substring(0, 50) + '...' 
                    : String(change.old)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Novo:</div>
                <div className="bg-green-50 p-1 rounded font-mono text-green-700 break-all">
                  {typeof change.new === 'string' && change.new.length > 50 
                    ? change.new.substring(0, 50) + '...' 
                    : String(change.new)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {changes.length > 6 && (
          <div className="text-center text-xs text-gray-500 bg-white p-2 rounded border">
            +{changes.length - 6} outras alterações não exibidas
          </div>
        )}
      </div>

      {/* Detalhes técnicos */}
      <div className="bg-gray-50 p-2 rounded">
        <div className="text-xs font-medium text-gray-700 mb-2">Detalhes Técnicos:</div>
        <div className="text-xs text-gray-600 font-mono space-y-1">
          {technicalDetails.map((detail, index) => (
            <div key={index}>{detail}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
