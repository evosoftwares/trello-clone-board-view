
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
  const lastProjectRef = useRef<string | null>(null);
  const isSubscribingRef = useRef(false);

  useEffect(() => {
    // Evita múltiplas subscrições simultâneas
    if (isSubscribingRef.current) {
      console.log("[KANBAN REALTIME] Already subscribing, skipping");
      return;
    }

    // Só resubscreve se o projeto mudou
    if (lastProjectRef.current === selectedProjectId) {
      console.log("[KANBAN REALTIME] Same project, skipping subscription");
      return;
    }

    const handleSubscription = async () => {
      isSubscribingRef.current = true;
      console.log("[KANBAN REALTIME] Starting subscription for project:", selectedProjectId);

      try {
        await subscribeToProject(selectedProjectId, {
          onTaskInsert,
          onTaskUpdate,
          onTaskDelete,
          onDataChange
        });
        
        lastProjectRef.current = selectedProjectId;
        console.log("[KANBAN REALTIME] Subscription completed");
      } catch (error) {
        console.error("[KANBAN REALTIME] Subscription failed:", error);
      } finally {
        isSubscribingRef.current = false;
      }
    };

    handleSubscription();

    return () => {
      console.log("[KANBAN REALTIME] Cleaning up subscription");
      isSubscribingRef.current = false;
    };
  }, [selectedProjectId]); // Apenas selectedProjectId como dependência

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[KANBAN REALTIME] Hook unmounting");
      unsubscribeFromProject();
    };
  }, []);

  return {
    isSubscribed: isConnected
  };
};
