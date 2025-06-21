
import React from 'react';
import { User } from 'lucide-react';
import { Profile } from '@/types/database';

interface TeamMemberProps {
  member: Profile & {
    taskCount: number;
    functionPoints: number;
  };
}

const TeamMember: React.FC<TeamMemberProps> = ({ member }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-blue-300 transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="h-10 px-4 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            {member.avatar ? (
              <img 
                src={member.avatar} 
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-blue-600">
                {getInitials(member.name)}
              </span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-gray-800 truncate">{member.name}</p>
            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
            <p className="text-xs text-gray-500">{member.taskCount} {member.taskCount === 1 ? 'tarefa' : 'tarefas'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-2 shrink-0">
            <div className="h-8 px-3 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">{member.functionPoints}</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">FPs</span>
        </div>
      </div>
    </div>
  );
};

export default TeamMember;
