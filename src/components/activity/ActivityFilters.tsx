
import React from 'react';
import { Calendar, Filter, Users, Zap, Clock, Search } from 'lucide-react';
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
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount} ativo{activeFiltersCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Busca por texto */}
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por tipo */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <SelectValue placeholder="Tipo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Todos os tipos</SelectItem>
              {Object.entries(ENTITY_TYPE_TRANSLATIONS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {key === 'task' && '✅'} 
                  {key === 'project' && '🏗️'} 
                  {key === 'team_member' && '👤'} 
                  {key === 'column' && '📊'} 
                  {key === 'tag' && '🏷️'} 
                  {' '}{value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por ação */}
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <SelectValue placeholder="Ação" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">⚡ Todas as ações</SelectItem>
              {Object.entries(ACTION_TYPE_TRANSLATIONS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {key === 'create' && '➕'} 
                  {key === 'update' && '✏️'} 
                  {key === 'delete' && '🗑️'} 
                  {key === 'move' && '↔️'} 
                  {' '}{value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por período */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📅 Todo período</SelectItem>
              <SelectItem value="today">🌅 Hoje</SelectItem>
              <SelectItem value="yesterday">🌄 Ontem</SelectItem>
              <SelectItem value="week">📊 Última semana</SelectItem>
              <SelectItem value="month">📈 Último mês</SelectItem>
              <SelectItem value="quarter">📉 Último trimestre</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por usuário */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600" />
                <SelectValue placeholder="Usuário" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">👥 Todos usuários</SelectItem>
              <SelectItem value="me">👤 Minhas ações</SelectItem>
              <SelectItem value="system">🤖 Sistema</SelectItem>
              <SelectItem value="admin">👑 Administradores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botão limpar filtros */}
        {activeFiltersCount > 0 && (
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Clock className="w-4 h-4" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
