import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, History, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { ProjectModal } from '@/components/projects/ProjectModal';

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const navigate = useNavigate();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img 
              src="/imagens/logo.svg" 
              alt="Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold text-gray-900">
              Kanban Board
            </h1>
          </div>
          
          {/* Project Selector */}
          <div className="hidden md:block">
            <ProjectSelector 
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Project Management Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Projetos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/activity-history')}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Histórico
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar} alt={profile?.name || 'User'} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {profile?.name || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile Project Selector */}
      <div className="block md:hidden px-6 pb-4">
        <ProjectSelector 
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      </div>

      {/* Project Management Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </header>
  );
};

export default Header;
