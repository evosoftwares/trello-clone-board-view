
import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityHistory } from '@/hooks/useActivityHistory';

const ActivitySummary: React.FC = () => {
  const { activities } = useActivityHistory();
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    byType: {} as Record<string, number>,
    byAction: {} as Record<string, number>,
    recent: [] as any[]
  });

  useEffect(() => {
    if (!activities.length) return;

    const today = new Date().toDateString();
    const todayActivities = activities.filter(
      activity => new Date(activity.created_at).toDateString() === today
    );

    const byType = activities.reduce((acc, activity) => {
      acc[activity.entity_type] = (acc[activity.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byAction = activities.reduce((acc, activity) => {
      acc[activity.action_type] = (acc[activity.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({
      total: activities.length,
      today: todayActivities.length,
      byType,
      byAction,
      recent: activities.slice(0, 5)
    });
  }, [activities]);

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'task':
        return 'Tarefas';
      case 'project':
        return 'Projetos';
      case 'team_member':
        return 'Membros';
      default:
        return type;
    }
  };

  const getActionTypeLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Criações';
      case 'update':
        return 'Atualizações';
      case 'delete':
        return 'Exclusões';
      case 'move':
        return 'Movimentações';
      default:
        return action;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Todas as modificações registradas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atividades Hoje</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.today}</div>
          <p className="text-xs text-muted-foreground">
            Modificações realizadas hoje
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Tipo</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{getEntityTypeLabel(type)}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Ação</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.byAction).map(([action, count]) => (
              <div key={action} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{getActionTypeLabel(action)}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitySummary;
