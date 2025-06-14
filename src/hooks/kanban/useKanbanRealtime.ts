
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
  const currentProjectRef = useRef<string | null>(null);

  useEffect(() => {
    // Only proceed if project actually changed
    if (currentProjectRef.current === selectedProjectId && channelRef.current && isSubscribedRef.current) {
      return;
    }

    console.log("[KANBAN REALTIME] Setting up realtime for project:", selectedProjectId);

    const setupRealtime = async () => {
      // Clean up existing channel first
      if (channelRef.current) {
        console.log("[KANBAN REALTIME] Cleaning up existing channel");
        isSubscribedRef.current = false;
        
        try {
          await channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn("[KANBAN REALTIME] Error during cleanup:", error);
        }
        
        channelRef.current = null;
        
        // Wait a bit to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create new channel with unique name
      const channelName = selectedProjectId 
        ? `kanban-project-${selectedProjectId}` 
        : 'kanban-all';

      console.log("[KANBAN REALTIME] Creating channel:", channelName);

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[KANBAN REALTIME] Task INSERT:', payload.new);
          const newTask = payload.new as Task;
          if (!selectedProjectId || newTask.project_id === selectedProjectId) {
            onTaskInsert(newTask);
          }
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[KANBAN REALTIME] Task UPDATE:', payload.new);
          const updatedTask = payload.new as Task;
          onTaskUpdate(updatedTask);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[KANBAN REALTIME] Task DELETE:', payload.old);
          onTaskDelete((payload.old as any).id);
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'kanban_columns' 
        }, () => {
          console.log('[KANBAN REALTIME] Columns changed');
          onDataChange();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_members' 
        }, () => {
          console.log('[KANBAN REALTIME] Team members changed');
          onDataChange();
        });

      channelRef.current = channel;
      currentProjectRef.current = selectedProjectId;

      // Subscribe only once
      channel.subscribe((status: string) => {
        console.log("[KANBAN REALTIME] Channel status:", status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
    };

    setupRealtime();

    // Cleanup function
    return () => {
      console.log("[KANBAN REALTIME] Cleaning up realtime");
      if (channelRef.current) {
        isSubscribedRef.current = false;
        currentProjectRef.current = null;
        
        channelRef.current.unsubscribe().catch((error: any) => {
          console.warn("[KANBAN REALTIME] Error during cleanup:", error);
        });
        
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedProjectId]); // Only depend on selectedProjectId, not the callback functions

  // Separate effect for callback updates - this won't cause re-subscription
  useEffect(() => {
    // Store the latest callbacks in refs so they can be used by the channel handlers
    // This is already handled by closure in the channel setup above
  }, [onTaskInsert, onTaskUpdate, onTaskDelete, onDataChange]);

  return {
    isSubscribed: isSubscribedRef.current
  };
};
