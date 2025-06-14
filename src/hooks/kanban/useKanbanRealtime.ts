
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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    console.log("[KANBAN REALTIME] Setting up realtime for project:", selectedProjectId);

    const setupRealtime = async () => {
      // Clear any existing cleanup timeout
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Clean up existing channel if it exists
      if (channelRef.current && isSubscribedRef.current) {
        console.log("[KANBAN REALTIME] Cleaning up existing channel");
        isSubscribedRef.current = false;
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create unique channel name
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const channelName = selectedProjectId
        ? `kanban-project-${selectedProjectId}-${timestamp}-${random}`
        : `kanban-all-${timestamp}-${random}`;

      console.log("[KANBAN REALTIME] Creating channel:", channelName);

      // Create new channel
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[KANBAN REALTIME] Task INSERT:', payload.new);
          const newTask = payload.new as Task;
          if (!selectedProjectId || newTask.project_id === selectedProjectId) {
            onTaskInsert(newTask);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[KANBAN REALTIME] Task UPDATE:', payload.new);
          const updatedTask = payload.new as Task;
          onTaskUpdate(updatedTask);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[KANBAN REALTIME] Task DELETE:', payload.old);
          onTaskDelete((payload.old as any).id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
          console.log('[KANBAN REALTIME] Columns changed');
          onDataChange();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
          console.log('[KANBAN REALTIME] Team members changed');
          onDataChange();
        });

      channelRef.current = channel;

      // Subscribe to the channel
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
        
        // Use timeout to ensure cleanup happens after component unmount
        cleanupTimeoutRef.current = setTimeout(async () => {
          if (channelRef.current) {
            await supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        }, 100);
      }
    };
  }, [selectedProjectId, onTaskInsert, onTaskUpdate, onTaskDelete, onDataChange]);

  return {
    isSubscribed: isSubscribedRef.current
  };
};
