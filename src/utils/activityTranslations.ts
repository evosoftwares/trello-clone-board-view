
export const ENTITY_TYPE_TRANSLATIONS = {
  task: 'Tarefa',
  project: 'Projeto',
  team_member: 'Membro da Equipe',
  column: 'Coluna',
  tag: 'Etiqueta',
} as const;

export const ACTION_TYPE_TRANSLATIONS = {
  create: 'Criado',
  update: 'Atualizado',
  delete: 'Removido',
  move: 'Movido',
} as const;

export const FIELD_TRANSLATIONS = {
  title: 'título',
  name: 'nome',
  description: 'descrição',
  function_points: 'pontos de função',
  complexity: 'complexidade',
  assignee: 'responsável',
  status: 'status',
  column_id: 'coluna',
  position: 'posição',
  estimated_hours: 'horas estimadas',
  deadline: 'prazo',
  budget: 'orçamento',
  project_id: 'projeto',
  client_name: 'nome do cliente',
  start_date: 'data de início',
  role: 'função',
  email: 'email',
  avatar: 'foto',
  is_active: 'status ativo',
  color: 'cor',
} as const;

// Mapeamentos para humanizar valores
export const COMPLEXITY_TRANSLATIONS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  very_high: 'Muito Alta',
} as const;

export const STATUS_TRANSLATIONS = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
} as const;

export const ROLE_TRANSLATIONS = {
  admin: 'Administrador',
  manager: 'Gerente',
  developer: 'Desenvolvedor',
  designer: 'Designer',
  tester: 'Testador',
  analyst: 'Analista',
} as const;

export const getEntityTypeName = (entityType: string): string => {
  return ENTITY_TYPE_TRANSLATIONS[entityType as keyof typeof ENTITY_TYPE_TRANSLATIONS] || entityType;
};

export const getActionTypeName = (actionType: string): string => {
  return ACTION_TYPE_TRANSLATIONS[actionType as keyof typeof ACTION_TYPE_TRANSLATIONS] || actionType;
};

export const getFieldName = (field: string): string => {
  return FIELD_TRANSLATIONS[field as keyof typeof FIELD_TRANSLATIONS] || field;
};

export const getComplexityName = (complexity: string): string => {
  return COMPLEXITY_TRANSLATIONS[complexity as keyof typeof COMPLEXITY_TRANSLATIONS] || complexity;
};

export const getStatusName = (status: string): string => {
  return STATUS_TRANSLATIONS[status as keyof typeof STATUS_TRANSLATIONS] || status;
};

export const getRoleName = (role: string): string => {
  return ROLE_TRANSLATIONS[role as keyof typeof ROLE_TRANSLATIONS] || role;
};
