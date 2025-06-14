
import React from "react";
import { useProjectData } from "@/hooks/useProjectData";
import { Project } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, Folder } from "lucide-react";

type Props = {
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
};

export const ProjectSelector: React.FC<Props> = ({ selectedProjectId, onSelect }) => {
  const { projects, loading } = useProjectData();

  return (
    <div className="flex items-center gap-2">
      <Folder className="text-blue-500" />
      <select
        className="rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm text-gray-800 shadow-sm transition-all"
        value={selectedProjectId ?? ""}
        onChange={e => onSelect(e.target.value || null)}
        disabled={loading}
      >
        <option value="">Todos os projetos</option>
        {loading && (
          <option disabled>
            <Loader2 className="animate-spin w-4 h-4 inline-block mr-1" />
            Carregando...
          </option>
        )}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} {p.status === "paused" ? "(Pausado)" : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
        onClick={() => alert("Em breve: gerente de projetos!")}
        variant="secondary"
      >
        + Projeto
      </Button>
    </div>
  );
};

export default ProjectSelector;
