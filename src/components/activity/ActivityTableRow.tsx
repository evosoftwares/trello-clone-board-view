
import React from 'react';
import { Plus, Edit, Trash2, Move, Clock, User } from 'lucide-react';
import { ActivityLog } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { ActivityChangeDetails } from './ActivityChangeDetails';
import { getEntityTypeName, getActionTypeName } from '@/utils/activityTranslations';

interface ActivityTableRowProps {
  activity: ActivityLog;
  referenceData: {
    profiles: Record<string, string>;
    projects: Record<string, string>;
    columns: Record<string, string>;
  };
}

export const ActivityTableRow: React.FC<ActivityTableRowProps> = ({ 
  activity, 
  referenceData 
}) => {
  const { profiles } = referenceData;

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
    return `${timeStr} - ${dateStr}`;
  };

  const getEntityTitle = () => {
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
    return `${getEntityTypeName(activity.entity_type)} (${activity.entity_id.slice(0, 8)})`;
  };

  const getUserName = () => {
    // Priorizar user_id sobre changed_by para consistência
    const userId = activity.user_id || activity.changed_by;
    if (!userId) return 'Sistema';
    
    // Se temos o user_id, usar os dados do perfil
    if (activity.user_id && profiles[activity.user_id]) {
      return profiles[activity.user_id];
    }
    
    // Fallback para changed_by se não temos o user_id ou dados do perfil
    if (activity.changed_by) {
      return activity.changed_by;
    }
    
    return `Usuário (${userId.slice(0, 8)})`;
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <div className="flex items-center justify-center">
          {getActionIcon(activity.action_type)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={getActionColor(activity.action_type)}>
            {getActionTypeName(activity.action_type)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getEntityTypeName(activity.entity_type)}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-gray-900">
          {getEntityTitle()}
        </div>
        <div className="text-xs text-gray-500">
          ID: {activity.entity_id.slice(0, 8)}...
        </div>
      </TableCell>
      <TableCell>
        <ActivityChangeDetails 
          activity={activity}
          referenceData={referenceData}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <User className="w-3 h-3" />
          {getUserName()}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600">
          {formatDateTime(activity.created_at)}
        </div>
      </TableCell>
    </TableRow>
  );
};
