
import React from 'react';
import { Clock, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ActivityTableRow } from '@/components/activity/ActivityTableRow';
import { ENTITY_TYPE_TRANSLATIONS, ACTION_TYPE_TRANSLATIONS } from '@/utils/activityTranslations';

const ActivityHistoryPage: React.FC = () => {
  const navigate = useNavigate();
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Erro ao carregar histórico: {error}
            </div>
            <div className="text-center mt-4">
              <Button onClick={() => fetchActivities()}>
                Tentar Novamente
              </Button>
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
                disabled={isLoading}
              >
                {isLoading ? 'Carregando...' : 'Atualizar'}
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
                    {Object.entries(ENTITY_TYPE_TRANSLATIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.entries(ACTION_TYPE_TRANSLATIONS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                Carregando histórico...
              </div>
            )}
            
            {!isLoading && activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma atividade encontrada com os filtros aplicados.
              </div>
            )}
            
            {!isLoading && activities.length > 0 && (
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
                    {activities.map((activity) => (
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
