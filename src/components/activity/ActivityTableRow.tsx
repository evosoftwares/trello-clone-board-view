
import React from 'react';
import { Clock, User, Edit, Plus, Trash2, Move, MessageCircle } from 'lucide-react';
import { ActivityLog } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { ENTITY_TYPE_TRANSLATIONS, getActionText } from '@/utils/activityTranslations';
import { ActivityChangeDetails } from './ActivityChangeDetails';

interface ActivityTableRowProps {
  activity: ActivityLog;
  referenceData: any;
  isEven: boolean;
}

export const ActivityTableRow: React.FC<ActivityTableRowProps> = ({
  activity,
  referenceData,
  isEven
}) => {
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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'move':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'task_comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return null;
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
    // Para comentários, mostrar preview do conteúdo
    if (activity.entity_type === 'task_comment') {
      const content = activity.new_data?.content || activity.old_data?.content || '';
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
      return `"${preview}"`;
    }

    // Para outros tipos, usar título ou nome
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

  const getUserName = (activity: ActivityLog) => {
    if (activity.user_id && referenceData?.profiles) {
      const profile = referenceData.profiles.find((p: any) => p.id === activity.user_id);
      if (profile) return profile.name;
    }
    return activity.changed_by || 'Sistema';
  };

  const getTaskReference = (activity: ActivityLog) => {
    if (activity.entity_type === 'task_comment' && activity.context?.task_id && referenceData?.tasks) {
      const task = referenceData.tasks.find((t: any) => t.id === activity.context.task_id);
      if (task) {
        return `Tarefa: ${task.title}`;
      }
    }
    return null;
  };

  return (
    <TableRow className={`${isEven ? 'bg-gray-50/50' : 'bg-white'} hover:bg-blue-50/30 transition-colors duration-150`}>
      {/* Ação */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center">
          {getActionIcon(activity.action_type)}
        </div>
      </TableCell>

      {/* Tipo */}
      <TableCell>
        <div className="flex items-center gap-2">
          {getEntityIcon(activity.entity_type)}
          <Badge variant="outline" className="text-xs font-medium">
            {ENTITY_TYPE_TRANSLATIONS[activity.entity_type as keyof typeof ENTITY_TYPE_TRANSLATIONS] || activity.entity_type}
          </Badge>
        </div>
      </TableCell>

      {/* Item */}
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-gray-900 text-sm">
            {getEntityTitle(activity)}
          </div>
          {getTaskReference(activity) && (
            <div className="text-xs text-gray-500">
              {getTaskReference(activity)}
            </div>
          )}
        </div>
      </TableCell>

      {/* Detalhes da Mudança */}
      <TableCell>
        <div className="space-y-2">
          <Badge className={`text-xs font-medium border ${getActionColor(activity.action_type)}`}>
            {getActionText(activity.action_type, activity.entity_type)}
          </Badge>
          <ActivityChangeDetails activity={activity} referenceData={referenceData} />
        </div>
      </TableCell>

      {/* Usuário */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {getUserName(activity)}
          </span>
        </div>
      </TableCell>

      {/* Data/Hora */}
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{formatDate(activity.created_at)}</span>
        </div>
      </TableCell>
    </TableRow>
  );
};
