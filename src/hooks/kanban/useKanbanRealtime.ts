
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const subscriptionKeyRef = useRef<string>('');

  useEffect(() => {
    const subscriptionKey = `${selectedProjectId || 'all'}-${Date.now()}`;
    subscriptionKeyRef.current = subscriptionKey;

    console.log("[KANBAN REALTIME] Setting up realtime for project:", selectedProjectId, "key:", subscriptionKey);

    const setupRealtime = () => {
      // Create unique channel name with timestamp
      const channelName = selectedProjectId
        ? `kanban-project-${selectedProjectId}-${Date.now()}`
        : `kanban-all-${Date.now()}`;

      console.log("[KANBAN REALTIME] Creating channel:", channelName);

      // Create new channel
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
          // Check if this subscription is still current
          if (subscriptionKeyRef.current !== subscriptionKey) return;
          
          console.log('[KANBAN REALTIME] Task INSERT:', payload.new);
          const newTask = payload.new as Task;
          if (!selectedProjectId || newTask.project_id === selectedProjectId) {
            onTaskInsert(newTask);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
          // Check if this subscription is still current
          if (subscriptionKeyRef.current !== subscriptionKey) return;
          
          console.log('[KANBAN REALTIME] Task UPDATE:', payload.new);
          const updatedTask = payload.new as Task;
          onTaskUpdate(updatedTask);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
          // Check if this subscription is still current
          if (subscriptionKeyRef.current !== subscriptionKey) return;
          
          console.log('[KANBAN REALTIME] Task DELETE:', payload.old);
          onTaskDelete((payload.old as any).id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
          // Check if this subscription is still current
          if (subscriptionKeyRef.current !== subscriptionKey) return;
          
          console.log('[KANBAN REALTIME] Columns changed');
          onDataChange();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
          // Check if this subscription is still current
          if (subscriptionKeyRef.current !== subscriptionKey) return;
          
          console.log('[KANBAN REALTIME] Team members changed');
          onDataChange();
        });

      channelRef.current = channel;

      // Subscribe to the channel - only once per channel instance
      channel.subscribe((status: string) => {
        console.log("[KANBAN REALTIME] Channel status:", status, "for key:", subscriptionKey);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
    };

    // Clean up existing channel before setting up new one
    const cleanupAndSetup = async () => {
      if (channelRef.current && isSubscribedRef.current) {
        console.log("[KANBAN REALTIME] Cleaning up existing channel before setup");
        isSubscribedRef.current = false;
        try {
          await supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn("[KANBAN REALTIME] Error during cleanup:", error);
        }
        channelRef.current = null;
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Only setup if this subscription is still current
      if (subscriptionKeyRef.current === subscriptionKey) {
        setupRealtime();
      }
    };

    cleanupAndSetup();

    // Cleanup function
    return () => {
      console.log("[KANBAN REALTIME] Cleaning up realtime for key:", subscriptionKey);
      
      // Mark this subscription as outdated
      if (subscriptionKeyRef.current === subscriptionKey) {
        subscriptionKeyRef.current = '';
      }
      
      if (channelRef.current) {
        isSubscribedRef.current = false;
        
        // Immediate cleanup
        supabase.removeChannel(channelRef.current).catch(error => {
          console.warn("[KANBAN REALTIME] Error during cleanup:", error);
        });
        
        channelRef.current = null;
      }
    };
  }, [selectedProjectId, onTaskInsert, onTaskUpdate, onTaskDelete, onDataChange]);

  return {
    isSubscribed: isSubscribedRef.current
  };
};
