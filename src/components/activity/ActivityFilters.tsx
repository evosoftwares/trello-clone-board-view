
import React from 'react';
import { Calendar, Filter, Users, Zap, Search, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ENTITY_TYPE_TRANSLATIONS, ACTION_TYPE_TRANSLATIONS } from '@/utils/activityTranslations';

interface ActivityFiltersProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterAction: string;
  setFilterAction: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: string;
  setDateRange: (value: string) => void;
  userFilter: string;
  setUserFilter: (value: string) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  filterType,
  setFilterType,
  filterAction,
  setFilterAction,
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  userFilter,
  setUserFilter,
  onClearFilters,
  activeFiltersCount
}) => {
  return (
    <Card className="rounded-2xl shadow-md border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">Filtros Avançados</h3>
            <p className="text-sm text-gray-600">Refine sua busca no histórico de atividades</p>
          </div>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 font-medium px-3 py-1">
              {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} ativo{activeFiltersCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Busca por texto */}
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar por título, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-2 border-gray-200 focus:border-blue-400 bg-white/50"
              />
            </div>
          </div>

          {/* Filtro por tipo */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-purple-400 bg-white/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <SelectValue placeholder="Tipo" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-lg bg-white/95 backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Todos os tipos
                </div>
              </SelectItem>
              {Object.entries(ENTITY_TYPE_TRANSLATIONS).map(([key, value]) => (
                <SelectItem key={key} value={key} className="rounded-lg">
                  <div className="flex items-center gap-2">
                    {key === 'task' && <Zap className="w-4 h-4 text-cyan-600" />}
                    {key === 'project' && <Settings className="w-4 h-4 text-orange-600" />}
                    {key === 'team_member' && <Users className="w-4 h-4 text-pink-600" />}
                    {key === 'column' && <Filter className="w-4 h-4 text-indigo-600" />}
                    {key === 'tag' && <Zap className="w-4 h-4 text-yellow-600" />}
                    {value}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por ação */}
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-green-400 bg-white/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <SelectValue placeholder="Ação" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-lg bg-white/95 backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Todas as ações
                </div>
              </SelectItem>
              {Object.entries(ACTION_TYPE_TRANSLATIONS).map(([key, value]) => (
                <SelectItem key={key} value={key} className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    {value}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por período */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-orange-400 bg-white/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-lg bg-white/95 backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Todo período
                </div>
              </SelectItem>
              <SelectItem value="today" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  Hoje
                </div>
              </SelectItem>
              <SelectItem value="yesterday" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Ontem
                </div>
              </SelectItem>
              <SelectItem value="week" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Última semana
                </div>
              </SelectItem>
              <SelectItem value="month" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Último mês
                </div>
              </SelectItem>
              <SelectItem value="quarter" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  Último trimestre
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por usuário */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="rounded-xl border-2 border-gray-200 focus:border-cyan-400 bg-white/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600" />
                <SelectValue placeholder="Usuário" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-0 shadow-lg bg-white/95 backdrop-blur-sm">
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Todos usuários
                </div>
              </SelectItem>
              <SelectItem value="me" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Minhas ações
                </div>
              </SelectItem>
              <SelectItem value="system" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-600" />
                  Sistema
                </div>
              </SelectItem>
              <SelectItem value="admin" className="rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Administradores
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botão limpar filtros */}
        {activeFiltersCount > 0 && (
          <div className="flex justify-end mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              className="rounded-full border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
