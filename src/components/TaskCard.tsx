
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  assignee?: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg p-3 border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
            snapshot.isDragging ? 'shadow-lg rotate-3 scale-105' : ''
          }`}
        >
          <p className="text-sm text-gray-800 font-medium">{task.title}</p>
          {task.assignee && (
            <div className="mt-2 flex items-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {task.assignee.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
