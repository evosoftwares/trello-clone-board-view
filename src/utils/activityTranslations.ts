
export const ENTITY_TYPE_TRANSLATIONS = {
  task: 'Tarefa',
  project: 'Projeto', 
  team_member: 'Membro da Equipe',
  column: 'Coluna',
  tag: 'Tag',
  task_comment: 'Comentário'
} as const;

export const ACTION_TYPE_TRANSLATIONS = {
  create: 'Criado',
  update: 'Atualizado', 
  delete: 'Excluído',
  move: 'Movido'
} as const;

export const getActionText = (action: string, entityType: string) => {
  const entity = ENTITY_TYPE_TRANSLATIONS[entityType as keyof typeof ENTITY_TYPE_TRANSLATIONS] || entityType;
  
  switch (action) {
    case 'create':
      return `${entity} ${entityType === 'task_comment' ? 'adicionado' : 'criada'}`;
    case 'update':
      return `${entity} ${entityType === 'task_comment' ? 'editado' : 'atualizada'}`;
    case 'delete':
      return `${entity} ${entityType === 'task_comment' ? 'removido' : 'excluída'}`;
    case 'move':
      return `${entity} movida`;
    default:
      return `${entity} modificada`;
  }
};
