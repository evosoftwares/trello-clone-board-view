
import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  assignee?: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
  onTaskClick?: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onTaskClick }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onTaskClick?.(task);
    console.log(`Card clicado: ${task.title} (ID: ${task.id})`);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={`group relative bg-white rounded-lg p-3 border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 animate-slide-in-from-bottom hover:shadow-lg overflow-hidden ${
            snapshot.isDragging 
              ? 'shadow-2xl rotate-2 scale-110 ring-4 ring-blue-400 ring-opacity-50 z-50 transform-gpu' 
              : isClicked
              ? 'scale-95 shadow-inner ring-2 ring-blue-300'
              : 'hover:scale-105 hover:-translate-y-2 hover:rotate-1'
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
            transform: snapshot.isDragging 
              ? `rotate(2deg) scale(1.1) ${provided.draggableProps.style?.transform || ''}`
              : provided.draggableProps.style?.transform,
            ...provided.draggableProps.style,
          }}
        >
          {/* Efeito de brilho sutil */}
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 to-transparent transition-transform duration-1000 ease-in-out ${
            snapshot.isDragging ? 'translate-x-0 opacity-60' : '-translate-x-full group-hover:translate-x-full'
          }`}></div>
          
          {/* Indicador de prioridade animado */}
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b transition-all duration-300 origin-top ${
            snapshot.isDragging 
              ? 'from-green-400 to-green-600 scale-y-100 w-2' 
              : isClicked
              ? 'from-purple-400 to-purple-600 scale-y-100'
              : 'from-blue-400 to-indigo-600 scale-y-0 group-hover:scale-y-100'
          }`}></div>
          
          <div className="relative z-10">
            <p className={`text-sm font-medium transition-colors duration-300 ${
              snapshot.isDragging 
                ? 'text-blue-800' 
                : isClicked
                ? 'text-purple-700'
                : 'text-gray-800 group-hover:text-blue-700'
            }`}>
              {task.title}
            </p>
            
            {task.assignee && (
              <div className="mt-2 flex items-center animate-fade-in-delay-1">
                <div className="relative">
                  <div className={`w-6 h-6 bg-gradient-to-br rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                    snapshot.isDragging 
                      ? 'from-green-100 to-green-200 rotate-45 scale-110' 
                      : isClicked
                      ? 'from-purple-100 to-purple-200 rotate-12'
                      : 'from-blue-100 to-indigo-200 group-hover:rotate-12'
                  }`}>
                    <span className={`text-xs font-medium animate-pulse-subtle ${
                      snapshot.isDragging 
                        ? 'text-green-600' 
                        : isClicked
                        ? 'text-purple-600'
                        : 'text-blue-600'
                    }`}>
                      {task.assignee.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Círculo de atividade */}
                  <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full transition-all duration-300 ${
                    snapshot.isDragging 
                      ? 'bg-green-400 animate-ping scale-150' 
                      : 'bg-green-400 animate-ping'
                  }`} style={{ opacity: 0.75 }}></div>
                  <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
                    snapshot.isDragging ? 'bg-green-500 scale-150' : 'bg-green-500'
                  }`}></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Efeito de ondulação no clique */}
          <div className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 ${
            isClicked 
              ? 'opacity-30 animate-ping bg-purple-400' 
              : 'opacity-0 group-active:opacity-20 group-active:animate-ping bg-blue-400'
          }`}></div>
          
          {/* Efeito especial durante drag */}
          {snapshot.isDragging && (
            <>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-green-400/20 animate-pulse"></div>
              <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-blue-300 to-green-300 opacity-20 blur-sm animate-pulse"></div>
            </>
          )}
          
          {/* Feedback visual de seleção */}
          {isClicked && (
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-200/40 to-blue-200/40 animate-pulse"></div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
