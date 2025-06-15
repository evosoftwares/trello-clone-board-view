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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              ❌ Erro ao carregar histórico: {error}
            </div>
            <Button onClick={() => fetchActivities()} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:bg-blue-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Histórico de Atividades</h1>
                <p className="text-gray-600">Acompanhe todas as mudanças do sistema</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Registro de Atividades</span>
              <span className="text-sm font-normal text-gray-500">
                {filteredActivities.length} de {activities.length} registros
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Carregando histórico...
                </div>
              </div>
            )}
            
            {!isLoading && filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Tente ajustar os filtros para ver mais resultados
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearAllFilters} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            )}
            
            {!isLoading && filteredActivities.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-16 text-center">Ação</TableHead>
                      <TableHead className="min-w-32">Tipo</TableHead>
                      <TableHead className="min-w-48">Item</TableHead>
                      <TableHead className="min-w-96">Detalhes da Mudança</TableHead>
                      <TableHead className="min-w-32">Usuário</TableHead>
                      <TableHead className="min-w-40">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity) => (
                      <ActivityTableRow
                        key={activity.id}
                        activity={activity}
                        referenceData={referenceData}
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
