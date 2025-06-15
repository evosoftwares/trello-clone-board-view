
import React from 'react';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="rounded-2xl shadow-md border-0 bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total de Atividades</p>
              <p className="text-3xl font-bold text-gray-900">{totalActivities.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border-0 bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Hoje</p>
              <p className="text-3xl font-bold text-gray-900">{todayActivities}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border-0 bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Usuários Ativos</p>
              <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border-0 bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 mb-1">Mais Ativo</p>
              <Badge 
                variant="outline" 
                className="mt-1 rounded-full border-orange-200 bg-orange-50 text-orange-700 font-medium px-3 py-1"
              >
                {mostActiveType}
              </Badge>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
