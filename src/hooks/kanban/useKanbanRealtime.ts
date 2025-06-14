
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
  
  // Use refs to store callbacks to prevent re-subscriptions
  const callbacksRef = useRef({
    onTaskInsert,
    onTaskUpdate,
    onTaskDelete,
    onDataChange
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onTaskInsert,
      onTaskUpdate,
      onTaskDelete,
      onDataChange
    };
  });

  // Only subscribe when project ID changes
  useEffect(() => {
    console.log('[KANBAN REALTIME] Project changed to:', selectedProjectId);
    
    subscribeToProject(selectedProjectId, callbacksRef.current);
    
    // Don't unsubscribe on unmount, let the context manage it
    return () => {
      console.log('[KANBAN REALTIME] Effect cleanup');
    };
  }, [selectedProjectId, subscribeToProject]);

  return {
    isSubscribed: isConnected
  };
};
