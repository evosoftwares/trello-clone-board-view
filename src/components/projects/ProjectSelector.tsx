
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useProjectData } from '@/hooks/useProjectData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ 
  selectedProjectId, 
  onSelect 
}) => {
  const { projects } = useProjectData();

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Projeto:</span>
      <Select 
        value={selectedProjectId || 'all'} 
        onValueChange={(value) => onSelect(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-64 h-10 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
          <SelectValue placeholder="Selecionar projeto">
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                <span className="truncate">{selectedProject.name}</span>
              </div>
            ) : (
              <span className="text-gray-500">Todos os projetos</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-gray-200 shadow-xl">
          <SelectItem value="all" className="rounded-lg">
            <span className="text-gray-600">Todos os projetos</span>
          </SelectItem>
          {projects.map(project => (
            <SelectItem key={project.id} value={project.id} className="rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
