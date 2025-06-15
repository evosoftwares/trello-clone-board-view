
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Tag, TaskTag, Project } from '@/types/database';
import { ProjectBadge } from './projects/ProjectBadge';

interface TaskCardProps {
  task: Task;
  index: number;
  tags: Tag[];
  taskTags: TaskTag[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  tags = [],
  taskTags = [],
  projects = [],
  onTaskClick
}) => {
  const taskTagIds = (taskTags || []).filter(tt => tt.task_id === task.id).map(tt => tt.tag_id);
  const taskTagsData = (tags || []).filter(tag => taskTagIds.includes(tag.id));
  const taskProject = projects.find(p => p.id === task.project_id);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onTaskClick(task)}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
        >
          {/* Header com ícones e projeto */}
          <div className="flex items-center justify-between mb-3">
            {/* Status Images */}
            {task.status_image_filenames && task.status_image_filenames.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                {task.status_image_filenames.map((imageName, index) => (
                  <img
                    key={index}
                    src={`/imagens/${imageName}`}
                    alt={`Status: ${imageName}`}
                    className="w-5 h-5 rounded object-contain"
                  />
                ))}
              </div>
            ) : (
              <div />
            )}

            {/* Function Points Badge */}
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center ml-auto">
              <span className="text-xs font-bold text-blue-600">{task.function_points || 0}</span>
            </div>
          </div>

          {/* Project Badge */}
          {taskProject && (
            <div className="mb-3">
              <ProjectBadge project={taskProject} size="sm" />
            </div>
          )}

          {/* Tags - Movidas para cima, antes do título */}
          {taskTagsData.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {taskTagsData.slice(0, 3).map((tag) => (
                <span 
                  key={tag.id} 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{ 
                    backgroundColor: tag.color + '15', 
                    borderColor: tag.color + '30',
                    color: tag.color 
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
              {taskTagsData.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  +{taskTagsData.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Título */}
          <h3 className="text-gray-900 font-semibold text-base mb-2 line-clamp-2">
            {task.title}
          </h3>

          {/* Descrição */}
          {task.description && (
            <p className="text-gray-500 text-sm mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Assignee info */}
          {task.assignee && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Responsável: {task.assignee}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
