
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
          className={`group relative bg-white rounded-lg p-3 border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300 animate-slide-in-from-bottom hover:shadow-lg overflow-hidden ${
            snapshot.isDragging 
              ? 'shadow-2xl rotate-3 scale-105 ring-2 ring-blue-300 ring-opacity-50 z-50' 
              : 'hover:scale-102 hover:-translate-y-1'
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
            ...provided.draggableProps.style,
          }}
        >
          {/* Efeito de brilho sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          
          {/* Indicador de prioridade animado */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
          
          <div className="relative z-10">
            <p className="text-sm text-gray-800 font-medium group-hover:text-blue-700 transition-colors duration-300">
              {task.title}
            </p>
            
            {task.assignee && (
              <div className="mt-2 flex items-center animate-fade-in-delay-1">
                <div className="relative">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center transform group-hover:rotate-12 transition-all duration-300 shadow-sm">
                    <span className="text-xs font-medium text-blue-600 animate-pulse-subtle">
                      {task.assignee.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Círculo de atividade */}
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Efeito de ondulação no clique */}
          <div className="absolute inset-0 rounded-lg opacity-0 group-active:opacity-20 group-active:animate-ping bg-blue-400 pointer-events-none"></div>
          
          {snapshot.isDragging && (
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
