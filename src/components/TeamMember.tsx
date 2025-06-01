
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
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-medium text-gray-800">{member.name}</span>
        </div>
        <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
          {member.taskCount}
        </div>
      </div>
    </div>
  );
};

export default TeamMember;
