export const ENTITY_TYPE_TRANSLATIONS = {
  task: 'Tarefa',
  project: 'Projeto',
  team_member: 'Colaborador',
  column: 'Coluna',
  tag: 'Etiqueta',
} as const;

export const ACTION_TYPE_TRANSLATIONS = {
  create: 'Criado',
  update: 'Modificado',
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
  status: 'situação',
  column_id: 'coluna',
  position: 'posição',
  estimated_hours: 'tempo estimado',
  deadline: 'prazo final',
  budget: 'orçamento',
  project_id: 'projeto',
  client_name: 'cliente',
  start_date: 'data de início',
  role: 'função',
  email: 'e-mail',
  avatar: 'foto do perfil',
  is_active: 'status',
  color: 'cor',
} as const;

// Mapeamentos mais humanos para valores
export const COMPLEXITY_TRANSLATIONS = {
  low: 'Simples',
  medium: 'Moderada',
  high: 'Complexa',
  very_high: 'Muito Complexa',
} as const;

export const STATUS_TRANSLATIONS = {
  todo: 'Para Fazer',
  in_progress: 'Em Desenvolvimento',
  review: 'Em Revisão',
  done: 'Finalizado',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
} as const;

export const ROLE_TRANSLATIONS = {
  admin: 'Administrador',
  manager: 'Gerente de Projeto',
  developer: 'Desenvolvedor',
  designer: 'Designer',
  tester: 'Analista de Testes',
  analyst: 'Analista de Sistemas',
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
