
import React, { useState } from 'react';
import { Clock, User, Edit, Plus, Trash2, Move, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityLog } from '@/types/database';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ActivityHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activities, loading, error, fetchActivities } = useActivityHistory();
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
    const entity = entityType === 'task' ? 'Tarefa' : 
                   entityType === 'project' ? 'Projeto' : 
                   entityType === 'team_member' ? 'Membro' : 'Item';
    
    switch (action) {
      case 'create':
        return `${entity} Criada`;
      case 'update':
        return `${entity} Atualizada`;
      case 'delete':
        return `${entity} Excluída`;
      case 'move':
        return `${entity} Movida`;
      default:
        return `${entity} Modificada`;
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

  const getDetailedChanges = (activity: ActivityLog) => {
    if (!activity.old_data || !activity.new_data) {
      if (activity.action_type === 'create') {
        return 'Item criado no sistema';
      }
      if (activity.action_type === 'delete') {
        return 'Item removido do sistema';
      }
      return 'Sem detalhes de mudança disponíveis';
    }

    const changes = [];
    const oldData = activity.old_data;
    const newData = activity.new_data;

    // Verificar mudanças específicas
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        switch (key) {
          case 'title':
            changes.push(`Título alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'name':
            changes.push(`Nome alterado de "${oldData[key]}" para "${newData[key]}"`);
            break;
          case 'description':
            changes.push(`Descrição modificada`);
            break;
          case 'function_points':
            changes.push(`Pontos de função: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'complexity':
            changes.push(`Complexidade: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'assignee':
            const oldAssignee = oldData[key] || 'nenhum';
            const newAssignee = newData[key] || 'nenhum';
            changes.push(`Responsável: ${oldAssignee} → ${newAssignee}`);
            break;
          case 'status':
            changes.push(`Status: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'column_id':
            changes.push(`Movido para outra coluna`);
            break;
          case 'position':
            changes.push(`Posição alterada: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'estimated_hours':
            changes.push(`Horas estimadas: ${oldData[key]} → ${newData[key]}`);
            break;
          case 'deadline':
            changes.push(`Prazo alterado de ${oldData[key]} para ${newData[key]}`);
            break;
          case 'budget':
            changes.push(`Orçamento alterado de ${oldData[key]} para ${newData[key]}`);
            break;
          default:
            if (typeof newData[key] === 'string' || typeof newData[key] === 'number') {
              changes.push(`${key}: ${oldData[key]} → ${newData[key]}`);
            }
            break;
        }
      }
    });

    return changes.length > 0 ? changes.join('; ') : 'Mudanças internas detectadas';
  };

  const filteredActivities = activities.filter(activity => {
    const typeMatch = filterType === 'all' || activity.entity_type === filterType;
    const actionMatch = filterAction === 'all' || activity.action_type === filterAction;
    return typeMatch && actionMatch;
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Erro ao carregar histórico: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico Completo de Atividades
                </CardTitle>
              </div>
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
            
            {!loading && filteredActivities.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Ação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="min-w-96">Mudanças Específicas</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getActionIcon(activity.action_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={getActionColor(activity.action_type)}>
                              {getActionText(activity.action_type, activity.entity_type)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {activity.entity_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {getEntityTitle(activity)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {activity.entity_id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700 max-w-96">
                            {getDetailedChanges(activity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <User className="w-3 h-3" />
                            {activity.changed_by || 'Sistema'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {formatDate(activity.created_at)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityHistoryPage;
