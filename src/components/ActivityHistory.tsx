
import React, { useState } from 'react';
import { Clock, User, Edit, Plus, Trash2, Move, Filter } from 'lucide-react';
import { ActivityLog } from '@/types/database';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityHistoryProps {
  entityType?: string;
  entityId?: string;
  title?: string;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  entityType, 
  entityId, 
  title = "Histórico de Atividades" 
}) => {
  const { activities, loading, error, fetchActivities } = useActivityHistory(entityType, entityId);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'move':
        return <Move className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'move':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string, entityType: string) => {
    const entity = entityType === 'task' ? 'tarefa' : 
                   entityType === 'project' ? 'projeto' : 
                   entityType === 'team_member' ? 'membro' : 'item';
    
    switch (action) {
      case 'create':
        return `${entity} criada`;
      case 'update':
        return `${entity} atualizada`;
      case 'delete':
        return `${entity} excluída`;
      case 'move':
        return `${entity} movida`;
      default:
        return `${entity} modificada`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityTitle = (activity: ActivityLog) => {
    if (activity.new_data?.title) {
      return activity.new_data.title;
    }
    if (activity.old_data?.title) {
      return activity.old_data.title;
    }
    if (activity.new_data?.name) {
      return activity.new_data.name;
    }
    if (activity.old_data?.name) {
      return activity.old_data.name;
    }
    return `${activity.entity_type} (${activity.entity_id.slice(0, 8)})`;
  };

  const getChangeSummary = (activity: ActivityLog) => {
    if (!activity.old_data || !activity.new_data) return null;

    const changes = [];
    const oldData = activity.old_data;
    const newData = activity.new_data;

    // Verificar mudanças comuns
    if (oldData.title !== newData.title) {
      changes.push(`Título: "${oldData.title}" → "${newData.title}"`);
    }
    if (oldData.description !== newData.description) {
      changes.push(`Descrição alterada`);
    }
    if (oldData.function_points !== newData.function_points) {
      changes.push(`Pontos de função: ${oldData.function_points} → ${newData.function_points}`);
    }
    if (oldData.complexity !== newData.complexity) {
      changes.push(`Complexidade: ${oldData.complexity} → ${newData.complexity}`);
    }
    if (oldData.assignee !== newData.assignee) {
      changes.push(`Responsável: ${oldData.assignee || 'nenhum'} → ${newData.assignee || 'nenhum'}`);
    }
    if (oldData.column_id !== newData.column_id) {
      changes.push(`Coluna alterada`);
    }
    if (oldData.position !== newData.position) {
      changes.push(`Posição: ${oldData.position} → ${newData.position}`);
    }

    return changes;
  };

  const filteredActivities = activities.filter(activity => {
    const typeMatch = filterType === 'all' || activity.entity_type === filterType;
    const actionMatch = filterAction === 'all' || activity.action_type === filterAction;
    return typeMatch && actionMatch;
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erro ao carregar histórico: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities()}
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="task">Tarefas</SelectItem>
                <SelectItem value="project">Projetos</SelectItem>
                <SelectItem value="team_member">Membros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="create">Criação</SelectItem>
              <SelectItem value="update">Atualização</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
              <SelectItem value="move">Movimentação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && (
          <div className="text-center py-8 text-gray-500">
            Carregando histórico...
          </div>
        )}
        
        {!loading && filteredActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhuma atividade encontrada.
          </div>
        )}
        
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const changes = getChangeSummary(activity);
            
            return (
              <div key={activity.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getActionIcon(activity.action_type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getActionColor(activity.action_type)}>
                      {getActionText(activity.action_type, activity.entity_type)}
                    </Badge>
                    <Badge variant="outline">
                      {activity.entity_type}
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">
                    {getEntityTitle(activity)}
                  </h4>
                  
                  {changes && changes.length > 0 && (
                    <div className="text-sm text-gray-600 mb-2">
                      <ul className="list-disc list-inside space-y-1">
                        {changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(activity.created_at)}
                    </div>
                    {activity.changed_by && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {activity.changed_by}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHistory;
