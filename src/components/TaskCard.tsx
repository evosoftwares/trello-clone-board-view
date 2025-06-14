
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Tag, TaskTag } from '@/types/database';

interface TaskCardProps {
  task: Task;
  index: number;
  tags: Tag[];
  taskTags: TaskTag[];
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  tags = [], // Default to empty array
  taskTags = [] // Default to empty array
}) => {
  // Get tags for this task with null safety
  const taskTagIds = (taskTags || []).filter(tt => tt.task_id === task.id).map(tt => tt.tag_id);
  const taskTagsData = (tags || []).filter(tag => taskTagIds.includes(tag.id));

  // Get complexity color for function points badge
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-600';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600';
      case 'high':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-sky-100 text-sky-600';
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
            snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : ''
          }`}
        >
          {/* Header com ícones */}
          <div className="flex items-center justify-between mb-3">
            {/* Status Images */}
            {task.status_image_filenames && task.status_image_filenames.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                {task.status_image_filenames.map((imageName, idx) => (
                  <img
                    key={idx}
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
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ml-auto ${getComplexityColor(task.complexity || 'medium')}`}>
              <span className="text-xs font-bold">{task.function_points || 0}</span>
            </div>
          </div>

          {/* Título */}
          <h3 className="text-gray-900 font-semibold text-base mb-2">
            {task.title}
          </h3>

          {/* Descrição */}
          <p className="text-gray-500 text-sm mb-4 truncate">
            {task.description || 'Sem descrição'}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {taskTagsData.length > 0 ? (
              taskTagsData.map((tag, tagIndex) => (
                <span 
                  key={tag.id} 
                  className={`px-3 py-1 rounded-full text-xs font-medium`}
                  style={{ 
                    backgroundColor: tag.color + '20', 
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </span>
              ))
            ) : null}
          </div>

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
