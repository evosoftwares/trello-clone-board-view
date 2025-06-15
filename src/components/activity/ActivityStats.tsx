
import React from 'react';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityStatsProps {
  totalActivities: number;
  todayActivities: number;
  activeUsers: number;
  mostActiveType: string;
}

export const ActivityStats: React.FC<ActivityStatsProps> = ({
  totalActivities,
  todayActivities,
  activeUsers,
  mostActiveType
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total de Atividades</p>
              <p className="text-2xl font-bold text-gray-900">{totalActivities}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{todayActivities}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Mais Ativo</p>
              <Badge variant="outline" className="mt-1">{mostActiveType}</Badge>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
