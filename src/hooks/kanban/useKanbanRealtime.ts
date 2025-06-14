
import { useEffect, useRef } from 'react';
import { useRealtimeContext } from '@/contexts/RealtimeContext';
import { Task } from '@/types/database';

interface UseKanbanRealtimeProps {
  selectedProjectId?: string | null;
  onTaskInsert: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onDataChange: () => void;
}

export const useKanbanRealtime = ({
  selectedProjectId,
  onTaskInsert,
  onTaskUpdate,
  onTaskDelete,
  onDataChange
}: UseKanbanRealtimeProps) => {
  const { subscribeToProject, unsubscribeFromProject, isConnected } = useRealtimeContext();
  const isInitialized = useRef(false);
  const currentProjectId = useRef<string | null>(null);

  useEffect(() => {
    // Only subscribe if project changed or first time
    if (currentProjectId.current !== selectedProjectId) {
      console.log('[KANBAN REALTIME] Project changed from', currentProjectId.current, 'to', selectedProjectId);
      
      currentProjectId.current = selectedProjectId;
      
      subscribeToProject(selectedProjectId, {
        onTaskInsert,
        onTaskUpdate,
        onTaskDelete,
        onDataChange
      });
      
      isInitialized.current = true;
    }
  }, [selectedProjectId, subscribeToProject, onTaskInsert, onTaskUpdate, onTaskDelete, onDataChange]);

  useEffect(() => {
    return () => {
      console.log('[KANBAN REALTIME] Hook cleanup');
      if (isInitialized.current) {
        unsubscribeFromProject();
        isInitialized.current = false;
      }
    };
  }, [unsubscribeFromProject]);

  return {
    isSubscribed: isConnected
  };
};
