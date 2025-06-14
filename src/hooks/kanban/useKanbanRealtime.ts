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
    // This effect now only runs when the selectedProjectId changes.
    // The latest callbacks are passed to subscribeToProject, which uses a ref
    // to keep them updated without needing them as dependencies here.
    console.log('[KANBAN REALTIME] Calling subscribeToProject for project:', selectedProjectId);
    subscribeToProject(selectedProjectId, {
      onTaskInsert,
      onTaskUpdate,
      onTaskDelete,
      onDataChange
    });
  }, [selectedProjectId, subscribeToProject]);

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
