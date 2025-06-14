
import { useEffect } from 'react';
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

  useEffect(() => {
    // This effect handles subscribing to a project and updating callbacks.
    // The context's subscribeToProject is smart enough to handle this efficiently.
    console.log('[KANBAN REALTIME] Calling subscribeToProject for project:', selectedProjectId);
    subscribeToProject(selectedProjectId, {
      onTaskInsert,
      onTaskUpdate,
      onTaskDelete,
      onDataChange
    });
  }, [selectedProjectId, onTaskInsert, onTaskUpdate, onTaskDelete, onDataChange, subscribeToProject]);

  useEffect(() => {
    // This effect handles cleanup when the component unmounts for good.
    return () => {
      console.log('[KANBAN REALTIME] Hook unmounting, calling unsubscribeFromProject.');
      unsubscribeFromProject();
    };
  }, [unsubscribeFromProject]);

  return {
    isSubscribed: isConnected
  };
};
