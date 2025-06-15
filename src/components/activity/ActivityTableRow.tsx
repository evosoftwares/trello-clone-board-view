
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
  isEven?: boolean;
}

export const ActivityTableRow: React.FC<ActivityTableRowProps> = ({ 
  activity, 
  referenceData,
  isEven = false
}) => {
  const { profiles } = referenceData;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm"><Plus className="w-4 h-4 text-white" /></div>;
      case 'update':
        return <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm"><Edit className="w-4 h-4 text-white" /></div>;
      case 'delete':
        return <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm"><Trash2 className="w-4 h-4 text-white" /></div>;
      case 'move':
        return <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm"><Move className="w-4 h-4 text-white" /></div>;
      default:
        return <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm"><Clock className="w-4 h-4 text-white" /></div>;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200';
      case 'move':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'task':
        return 'bg-gradient-to-r from-cyan-50 to-cyan-100 text-cyan-800 border-cyan-200';
      case 'project':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-200';
      case 'team_member':
        return 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-800 border-pink-200';
      case 'column':
        return 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 border-indigo-200';
      case 'tag':
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
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
    <TableRow className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 ${isEven ? 'bg-gray-50/30' : 'bg-white'}`}>
      <TableCell className="text-center py-4">
        {getActionIcon(activity.action_type)}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-2">
          <Badge className={`${getActionColor(activity.action_type)} font-medium rounded-full px-3 py-1 text-xs border-2`}>
            {getActionTypeName(activity.action_type)}
          </Badge>
          <Badge variant="outline" className={`${getEntityColor(activity.entity_type)} text-xs rounded-full px-3 py-1 border-2`}>
            {getEntityTypeName(activity.entity_type)}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 leading-tight">
            {getEntityTitle()}
          </div>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 rounded-md px-2 py-1 inline-block">
            #{activity.entity_id.slice(0, 8)}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <ActivityChangeDetails 
          activity={activity}
          referenceData={referenceData}
        />
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <span className="text-sm text-gray-700 font-medium">
            {getUserName()}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="text-sm text-gray-600 font-medium bg-gray-50 rounded-lg px-3 py-2">
          {formatDateTime(activity.created_at)}
        </div>
      </TableCell>
    </TableRow>
  );
};
