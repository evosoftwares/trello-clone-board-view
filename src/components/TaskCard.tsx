import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  assignee?: string;
  statusImageFilenames?: string[]; // Nova propriedade para os nomes dos arquivos de imagem de status
}

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const tagColorClasses = [
    'bg-blue-100 text-blue-700',
    'bg-yellow-100 text-yellow-700',
    'bg-red-100 text-red-700',
    'bg-purple-100 text-purple-700',
  ];

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
            {/* Status Images are now here, replacing the static icons */}
            {task.statusImageFilenames && task.statusImageFilenames.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                {task.statusImageFilenames.map((imageName, idx) => (
                  <img
                    key={idx}
                    src={`/imagens/${imageName}`}
                    alt={`Status: ${imageName}`}
                    className="w-5 h-5 rounded object-contain" // Adicionado tamanho e object-contain
                  />
                ))}
              </div>
            ) : (
              // Div vazio para manter o layout se não houver imagens,
              // garantindo que justify-between funcione para o número azul
              <div /> 
            )}

            {/* Placeholder para o número azul/prioridade */}
            <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center ml-auto">
              <span className="text-sky-600 text-xs font-bold">?</span> {/* Sempre deverá ser um integer*/}
            </div>
          </div>

          {/* Título */}
          <h3 className="text-gray-900 font-semibold text-base mb-2">
            {task.title || 'Título'}
          </h3>

          {/* Descrição */}
          {/* Truncando a descrição para melhor legibilidade */}
          <p className="text-gray-500 text-sm mb-4 truncate">
            {task.description || 'Sem descrição'}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {task.tags && task.tags.length > 0 ? (
              task.tags.map((tag, tagIndex) => (
                <span key={tagIndex} className={`px-3 py-1 rounded-full text-xs font-medium 
                  ${tagColorClasses[tagIndex % tagColorClasses.length]}
                `}>
                  {tag}
                </span>
              ))
            ) : null}
          </div>          
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;