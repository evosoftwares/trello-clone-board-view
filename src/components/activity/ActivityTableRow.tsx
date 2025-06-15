
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
        return <div className="p-2 bg-green-100 rounded-full"><Plus className="w-4 h-4 text-green-600" /></div>;
      case 'update':
        return <div className="p-2 bg-blue-100 rounded-full"><Edit className="w-4 h-4 text-blue-600" /></div>;
      case 'delete':
        return <div className="p-2 bg-red-100 rounded-full"><Trash2 className="w-4 h-4 text-red-600" /></div>;
      case 'move':
        return <div className="p-2 bg-purple-100 rounded-full"><Move className="w-4 h-4 text-purple-600" /></div>;
      default:
        return <div className="p-2 bg-gray-100 rounded-full"><Clock className="w-4 h-4 text-gray-600" /></div>;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'update':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'delete':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'move':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'task':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'project':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'team_member':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'column':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'tag':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffHours * 60);
      return `há ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `há ${Math.floor(diffHours)}h`;
    } else {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
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
    return `${getEntityTypeName(activity.entity_type)}`;
  };

  const getUserName = () => {
    const userId = activity.user_id || activity.changed_by;
    if (!userId) return 'Sistema';
    
    if (activity.user_id && profiles[activity.user_id]) {
      return profiles[activity.user_id];
    }
    
    if (activity.changed_by) {
      return activity.changed_by;
    }
    
    return `Usuário (${userId.slice(0, 8)})`;
  };

  return (
    <TableRow className="hover:bg-blue-50/30 transition-colors">
      <TableCell className="text-center">
        {getActionIcon(activity.action_type)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <Badge className={`${getActionColor(activity.action_type)} font-medium`}>
            {getActionTypeName(activity.action_type)}
          </Badge>
          <Badge variant="outline" className={`${getEntityColor(activity.entity_type)} text-xs`}>
            {getEntityTypeName(activity.entity_type)}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-gray-900 mb-1">
          {getEntityTitle()}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          #{activity.entity_id.slice(0, 8)}
        </div>
      </TableCell>
      <TableCell>
        <ActivityChangeDetails 
          activity={activity}
          referenceData={referenceData}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gray-100 rounded-full">
            <User className="w-3 h-3 text-gray-600" />
          </div>
          <span className="text-sm text-gray-700 font-medium">
            {getUserName()}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600 font-medium">
          {formatDateTime(activity.created_at)}
        </div>
      </TableCell>
    </TableRow>
  );
};
