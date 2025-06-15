
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TaskTimerProps {
  startTime: string | null;
  className?: string;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ startTime, className = '' }) => {
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (!startTime) {
      setDuration('');
      return;
    }

    const updateDuration = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      
      if (diffMs < 0) {
        setDuration('0m');
        return;
      }

      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        const remainingHours = hours % 24;
        setDuration(`${days}d ${remainingHours}h`);
      } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        setDuration(`${hours}h ${remainingMinutes}m`);
      } else if (minutes > 0) {
        setDuration(`${minutes}m`);
      } else {
        setDuration(`${seconds}s`);
      }
    };

    updateDuration();
    // Atualizar a cada 30 segundos para ser mais responsivo
    const interval = setInterval(updateDuration, 30000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime || !duration) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <Clock className="w-3 h-3" />
      <span>{duration}</span>
    </div>
  );
};

export default TaskTimer;
