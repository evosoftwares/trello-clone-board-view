
export const ENTITY_TYPE_TRANSLATIONS = {
  task: 'Tarefa',
  project: 'Projeto',
  team_member: 'Membro da Equipe',
  column: 'Coluna',
  tag: 'Tag',
} as const;

export const ACTION_TYPE_TRANSLATIONS = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  move: 'Movimentação',
} as const;

export const FIELD_TRANSLATIONS = {
  title: 'Título',
  name: 'Nome',
  description: 'Descrição',
  function_points: 'Pontos de Função',
  complexity: 'Complexidade',
  assignee: 'Responsável',
  status: 'Status',
  column_id: 'Coluna',
  position: 'Posição',
  estimated_hours: 'Horas Estimadas',
  deadline: 'Prazo',
  budget: 'Orçamento',
  project_id: 'Projeto',
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
