
import React from 'react';
import { User } from 'lucide-react';

interface TeamMemberProps {
  member: {
    id: string;
    name: string;
    taskCount: number;
    avatar: string;
  };
}

const TeamMember: React.FC<TeamMemberProps> = ({ member }) => {
  return (
    <div className="group bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-fade-in-scale cursor-pointer relative overflow-hidden">
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center transform group-hover:rotate-12 transition-all duration-300 shadow-sm group-hover:shadow-md">
              <User className="w-5 h-5 text-blue-600 animate-pulse-subtle" />
            </div>
            {/* Círculo de status animado */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
            {member.name}
          </span>
        </div>
        <div className="relative">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center shadow-sm transform group-hover:scale-110 transition-all duration-300 animate-bounce-subtle">
            {member.taskCount}
          </div>
          {member.taskCount > 0 && (
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
          )}
        </div>
      </div>
      
      {/* Barra de progresso animada */}
      <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transform origin-left transition-all duration-1000 ease-out animate-progress-fill"
          style={{ width: `${Math.min(member.taskCount * 25, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default TeamMember;
