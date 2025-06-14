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
  const lastProjectId = useRef<string | null>(null);
  const callbacksRef = useRef({
    onTaskInsert,
    onTaskUpdate,
    onTaskDelete,
    onDataChange
  });

  // Always keep callbacks up to date
  callbacksRef.current = {
    onTaskInsert,
    onTaskUpdate,
    onTaskDelete,
    onDataChange
  };

  useEffect(() => {
    // Only resubscribe if project actually changed
    if (lastProjectId.current !== selectedProjectId) {
      console.log('[KANBAN REALTIME] Project changed:', lastProjectId.current, '->', selectedProjectId);
      lastProjectId.current = selectedProjectId;
      
      subscribeToProject(selectedProjectId, callbacksRef.current);
    }
  }, [selectedProjectId, subscribeToProject]);

  useEffect(() => {
    return () => {
      console.log('[KANBAN REALTIME] Hook cleanup');
      unsubscribeFromProject();
    };
  }, [unsubscribeFromProject]);

  return {
    isSubscribed: isConnected
  };
};
