import React, { createContext, useContext, useRef, useEffect, ReactNode, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Task } from '@/types/database';

interface RealtimeContextType {
  subscribeToProject: (
    projectId: string | null,
    callbacks: {
      onTaskInsert: (task: Task) => void;
      onTaskUpdate: (task: Task) => void;
      onTaskDelete: (taskId: string) => void;
      onDataChange: () => void;
    }
  ) => void;
  unsubscribeFromProject: () => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtimeContext = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef<any>(null);
  const currentProjectRef = useRef<string | null>(null);

  const unsubscribeFromProject = useCallback(async () => {
    if (channelRef.current) {
      console.log('[REALTIME MANAGER] Unsubscribing from channel', channelRef.current.topic);
      try {
        // removeChannel also handles unsubscribing
        await supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('[REALTIME MANAGER] Error removing channel:', error);
      } finally {
        channelRef.current = null;
        setIsConnected(false);
        currentProjectRef.current = null;
        console.log('[REALTIME MANAGER] Unsubscribed successfully.');
      }
    }
  }, []);

  const subscribeToProject = useCallback(async (
    projectId: string | null,
    callbacks: {
      onTaskInsert: (task: Task) => void;
      onTaskUpdate: (task: Task) => void;
      onTaskDelete: (taskId: string) => void;
      onDataChange: () => void;
    }
  ) => {
    callbacksRef.current = callbacks;
    const channelName = `kanban-project-${projectId || 'global'}`;

    // If we're already on the correct channel, do nothing.
    if (channelRef.current && channelRef.current.topic === `realtime:${channelName}`) {
        console.log(`[REALTIME MANAGER] Already on channel ${channelName}.`);
        return;
    }

    // Unsubscribe from the previous channel before creating a new one.
    await unsubscribeFromProject();
    
    currentProjectRef.current = projectId;
    console.log(`[REALTIME MANAGER] Creating channel: ${channelName}`);
    const newChannel = supabase.channel(channelName, {
        config: { broadcast: { ack: true } },
    });
    
    // This can happen with fast re-renders. If so, just update our ref and state.
    if (newChannel.state === 'joined' || newChannel.state === 'joining') {
        console.log(`[REALTIME MANAGER] Channel is already in state: ${newChannel.state}. Not re-subscribing.`);
        channelRef.current = newChannel;
        setIsConnected(true);
        return;
    }

    channelRef.current = newChannel;

    newChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[REALTIME MANAGER] Task INSERT:', payload.new);
          const newTask = payload.new as Task;
          if (!currentProjectRef.current || newTask.project_id === currentProjectRef.current) {
            callbacksRef.current?.onTaskInsert(newTask);
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[REALTIME MANAGER] Task UPDATE:', payload.new);
          callbacksRef.current?.onTaskUpdate(payload.new as Task);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
          console.log('[REALTIME MANAGER] Task DELETE:', payload.old);
          callbacksRef.current?.onTaskDelete((payload.old as any).id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
          console.log('[REALTIME MANAGER] Columns changed');
          callbacksRef.current?.onDataChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
          console.log('[REALTIME MANAGER] Team members changed');
          callbacksRef.current?.onDataChange();
      });
    
    newChannel.subscribe((status, err) => {
      if (channelRef.current?.topic !== newChannel.topic) {
        return; // Ignore callbacks from stale channels
      }
      
      console.log(`[REALTIME MANAGER] Channel ${newChannel.topic} status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error('[REALTIME MANAGER] Channel subscription failed or closed:', err);
        setIsConnected(false);
        // Clean up this specific channel if it fails, without causing loops.
        if (channelRef.current === newChannel) {
          unsubscribeFromProject();
        }
      }
    });

  }, [unsubscribeFromProject]);

  useEffect(() => {
    return () => {
      console.log("[REALTIME MANAGER] Provider unmounting, cleaning up.");
      unsubscribeFromProject();
    }
  }, [unsubscribeFromProject]);

  return (
    <RealtimeContext.Provider
      value={{
        subscribeToProject,
        unsubscribeFromProject,
        isConnected
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
