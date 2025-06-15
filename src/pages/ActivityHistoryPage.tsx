
import React, { useState, useMemo } from 'react';
import { Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ActivityTableRow } from '@/components/activity/ActivityTableRow';
import { ActivityFilters } from '@/components/activity/ActivityFilters';
import { ActivityStats } from '@/components/activity/ActivityStats';
import { ENTITY_TYPE_TRANSLATIONS } from '@/utils/activityTranslations';

const ActivityHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  
  const { 
    activities, 
    loading, 
    error, 
    fetchActivities,
    filterType,
    setFilterType,
    filterAction,
    setFilterAction,
  } = useActivityHistory();
  
  const { referenceData, isLoading: referenceLoading } = useReferenceData();

  const isLoading = loading || referenceLoading;

  // Calcular estatísticas
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayActivities = activities.filter(
      activity => new Date(activity.created_at).toDateString() === today
    ).length;

    const uniqueUsers = new Set(
      activities.map(activity => activity.user_id || activity.changed_by).filter(Boolean)
    ).size;

    const typeCount = activities.reduce((acc, activity) => {
      acc[activity.entity_type] = (acc[activity.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeEntries = Object.entries(typeCount);
    const mostActiveType = typeEntries.length > 0 
      ? typeEntries.reduce((a, b) => typeCount[a[0]] > typeCount[b[0]] ? a : b)[0]
      : null;

    return {
      totalActivities: activities.length,
      todayActivities,
      activeUsers: uniqueUsers,
      mostActiveType: mostActiveType ? ENTITY_TYPE_TRANSLATIONS[mostActiveType as keyof typeof ENTITY_TYPE_TRANSLATIONS] : 'N/A'
    };
  }, [activities]);

  // Filtrar atividades com base nos filtros avançados
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(activity => {
        const title = activity.new_data?.title || activity.old_data?.title || '';
        const name = activity.new_data?.name || activity.old_data?.name || '';
        const description = activity.new_data?.description || activity.old_data?.description || '';
        
        return (
          title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filtro por período
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          filterDate.setDate(filterDate.getDate() - 1);
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(filterDate.getMonth() - 3);
          break;
      }

      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.created_at);
        if (dateRange === 'today') {
          return activityDate.toDateString() === now.toDateString();
        } else if (dateRange === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return activityDate.toDateString() === yesterday.toDateString();
        }
        return activityDate >= filterDate;
      });
    }

    return filtered;
  }, [activities, searchTerm, dateRange]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterAction !== 'all') count++;
    if (searchTerm) count++;
    if (dateRange !== 'all') count++;
    if (userFilter !== 'all') count++;
    return count;
  }, [filterType, filterAction, searchTerm, dateRange, userFilter]);

  const clearAllFilters = () => {
    setFilterType('all');
    setFilterAction('all');
    setSearchTerm('');
    setDateRange('all');
    setUserFilter('all');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <Card className="max-w-md mx-auto rounded-3xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar histórico</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => fetchActivities()} 
              className="rounded-full px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Histórico de Atividades</h1>
                <p className="text-gray-600">Acompanhe todas as mudanças do sistema</p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities()}
            disabled={isLoading}
            className="rounded-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>

        {/* Estatísticas */}
        <ActivityStats {...stats} />

        {/* Filtros */}
        <ActivityFilters
          filterType={filterType}
          setFilterType={setFilterType}
          filterAction={filterAction}
          setFilterAction={setFilterAction}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateRange={dateRange}
          setDateRange={setDateRange}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          onClearFilters={clearAllFilters}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Tabela de atividades */}
        <Card className="rounded-3xl shadow-lg border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
            <CardTitle className="flex items-center justify-between text-xl">
              <span className="text-gray-900">Registro de Atividades</span>
              <span className="text-sm font-normal text-gray-500 bg-white rounded-full px-4 py-1.5">
                {filteredActivities.length} de {activities.length} registros
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-gray-600 font-medium">Carregando histórico...</p>
              </div>
            )}
            
            {!isLoading && filteredActivities.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Tente ajustar os filtros para ver mais resultados ou aguarde novas atividades serem registradas
                </p>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={clearAllFilters} 
                    className="rounded-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            )}
            
            {!isLoading && filteredActivities.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-blue-100">
                      <TableHead className="w-16 text-center font-semibold text-gray-700">Ação</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-700">Tipo</TableHead>
                      <TableHead className="min-w-48 font-semibold text-gray-700">Item</TableHead>
                      <TableHead className="min-w-96 font-semibold text-gray-700">Detalhes da Mudança</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-700">Usuário</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-700">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity, index) => (
                      <ActivityTableRow
                        key={activity.id}
                        activity={activity}
                        referenceData={referenceData}
                        isEven={index % 2 === 0}
                      />
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
