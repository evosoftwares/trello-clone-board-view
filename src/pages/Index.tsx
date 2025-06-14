
import KanbanBoard from '@/components/KanbanBoard';
import { ProjectProvider } from '@/contexts/ProjectContext';

const Index = () => {
  return (
    <ProjectProvider>
      <KanbanBoard />
    </ProjectProvider>
  );
};

export default Index;
