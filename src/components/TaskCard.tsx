
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, User, MessageCircle, Tag } from 'lucide-react';
import { Task, TeamMember, Project, Tag as TagType } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { ProjectBadge } from '@/components/projects/ProjectBadge';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  teamMembers: TeamMember[];
  projects: Project[];
  tags: TagType[];
  taskTags: { task_id: string; tag_id: string }[];
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  onClick, 
  teamMembers, 
  projects, 
  tags, 
  taskTags 
}) => {
  // Encontrar o nome do responsável
  const assignee = teamMembers.find(member => member.id === task.assignee);
  const assigneeName = assignee ? assignee.name : null;

  // Encontrar o projeto associado
  const project = projects.find(p => p.id === task.project_id);

  // Encontrar as tags da tarefa
  const taskTagIds = taskTags.filter(tt => tt.task_id === task.id).map(tt => tt.tag_id);
  const taskTagList = tags.filter(tag => taskTagIds.includes(tag.id));

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          }`}
          onClick={onClick}
        >
          <div className="space-y-3">
            {/* Header com título e projeto */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                {task.title}
              </h3>
              
              {project && (
                <ProjectBadge project={project} size="sm" />
              )}
            </div>

            {/* Descrição */}
            {task.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Tags */}
            {taskTagList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {taskTagList.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 h-5"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    <Tag className="w-2.5 h-2.5 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
                {taskTagList.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 h-5">
                    +{taskTagList.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Informações da tarefa */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {/* Pontos de função */}
                {task.function_points > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">
                        {task.function_points}
                      </span>
                    </div>
                  </div>
                )}

                {/* Horas estimadas */}
                {task.estimated_hours && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.estimated_hours}h</span>
                  </div>
                )}

                {/* Comentários */}
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>0</span>
                </div>
              </div>

              {/* Responsável */}
              {assigneeName && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{assigneeName}</span>
                </div>
              )}
            </div>

            {/* Complexidade */}
            {task.complexity && (
              <div className="flex justify-end">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 h-5 ${
                    task.complexity === 'low' ? 'border-green-300 text-green-700 bg-green-50' :
                    task.complexity === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                    task.complexity === 'high' ? 'border-red-300 text-red-700 bg-red-50' :
                    'border-gray-300 text-gray-700 bg-gray-50'
                  }`}
                >
                  {task.complexity === 'low' ? 'Baixa' :
                   task.complexity === 'medium' ? 'Média' :
                   task.complexity === 'high' ? 'Alta' : 
                   task.complexity}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
