
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, User, MessageCircle, Tag } from 'lucide-react';
import { Task, TeamMember, Project, Tag as TagType } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { ProjectBadge } from '@/components/projects/ProjectBadge';
import TaskTimer from './TaskTimer';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  teamMembers: TeamMember[];
  projects: Project[];
  tags: TagType[];
  taskTags: { task_id: string; tag_id: string }[];
  columns: { id: string; title: string }[];
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  onClick, 
  teamMembers, 
  projects, 
  tags, 
  taskTags,
  columns 
}) => {
  // Encontrar o nome do responsável
  const assignee = teamMembers.find(member => member.id === task.assignee);
  const assigneeName = assignee ? assignee.name : null;

  // Encontrar o projeto associado
  const project = projects.find(p => p.id === task.project_id);

  // Encontrar as tags da tarefa
  const taskTagIds = taskTags.filter(tt => tt.task_id === task.id).map(tt => tt.tag_id);
  const taskTagList = tags.filter(tag => taskTagIds.includes(tag.id));

  // Verificar se a tarefa está na coluna "Concluído"
  const currentColumn = columns.find(col => col.id === task.column_id);
  const isCompleted = currentColumn?.title?.toLowerCase().includes('concluído') || 
                     currentColumn?.title?.toLowerCase().includes('concluido') ||
                     currentColumn?.title?.toLowerCase().includes('completed') ||
                     currentColumn?.title?.toLowerCase().includes('done');

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isCompleted}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          } ${isCompleted ? 'opacity-75 bg-gray-50' : ''}`}
          onClick={onClick}
        >
          <div className="space-y-3">
            {/* Header: Título e Projeto */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-semibold text-sm leading-tight line-clamp-2 flex-1 ${
                  isCompleted ? 'text-gray-600' : 'text-gray-900'
                }`}>
                  {task.title}
                </h3>
                {/* Complexidade no canto superior direito */}
                {task.complexity && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0.5 h-5 shrink-0 ${
                      task.complexity === 'low' ? 'border-green-300 text-green-700 bg-green-50' :
                      task.complexity === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                      task.complexity === 'high' ? 'border-red-300 text-red-700 bg-red-50' :
                      'border-gray-300 text-gray-700 bg-gray-50'
                    }`}
                  >
                    {task.complexity === 'low' ? 'B' :
                     task.complexity === 'medium' ? 'M' :
                     task.complexity === 'high' ? 'A' : 
                     task.complexity}
                  </Badge>
                )}
              </div>
              
              {project && (
                <ProjectBadge project={project} size="sm" />
              )}
            </div>

            {/* Cronômetro de tempo na coluna atual - Oculto se concluído */}
            {!isCompleted && (
              <TaskTimer 
                startTime={task.current_status_start_time} 
                className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md"
              />
            )}

            {/* Descrição */}
            {task.description && (
              <p className={`text-xs line-clamp-2 ${
                isCompleted ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {task.description}
              </p>
            )}

            {/* Tags */}
            {taskTagList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {taskTagList.slice(0, 2).map((tag) => (
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
                {taskTagList.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 h-5">
                    +{taskTagList.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer: Métricas e Responsável */}
            <div className="flex items-center justify-between pt-1">
              {/* Métricas à esquerda */}
              <div className={`flex items-center space-x-3 text-xs ${
                isCompleted ? 'text-gray-400' : 'text-gray-500'
              }`}>
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

              {/* Responsável à direita */}
              {assigneeName && (
                <div className={`flex items-center gap-1 text-xs ${
                  isCompleted ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="font-medium max-w-16 truncate">{assigneeName}</span>
                </div>
              )}
            </div>

            {/* Indicador visual de tarefa concluída */}
            {isCompleted && (
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Concluída</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
