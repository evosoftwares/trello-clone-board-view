
import React from 'react';
import { User } from 'lucide-react';
import { TeamMember as TeamMemberType } from '@/types/database';

interface TeamMemberProps {
  member: TeamMemberType & {
    taskCount: number;
    functionPoints: number;
  };
}

const TeamMember: React.FC<TeamMemberProps> = ({ member }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-gray-800 truncate">{member.name}</p>
            <p className="text-xs text-gray-500">{member.taskCount} {member.taskCount === 1 ? 'tarefa' : 'tarefas'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-2 shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">{member.functionPoints}</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">FPs</span>
        </div>
      </div>
    </div>
  );
};

export default TeamMember;
