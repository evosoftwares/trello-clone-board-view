
import React from 'react';
import { Project } from '@/types/database';

interface ProjectBadgeProps {
  project: Project;
  size?: 'sm' | 'md';
  showName?: boolean;
}

export const ProjectBadge: React.FC<ProjectBadgeProps> = ({ 
  project, 
  size = 'sm', 
  showName = true 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  return (
    <div 
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: project.color + '20', 
        color: project.color,
        border: `1px solid ${project.color}30`
      }}
    >
      <div 
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: project.color }}
      />
      {showName && (
        <span className="truncate max-w-20">
          {project.name}
        </span>
      )}
    </div>
  );
};

export default ProjectBadge;
