
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
  const isSubscribingRef = useRef(false);

  const unsubscribeFromProject = useCallback(async () => {
    if (channelRef.current) {
      const channel = channelRef.current;
      console.log('[REALTIME MANAGER] Cleaning up channel', channel.topic);
      
      try {
        // Only unsubscribe if not already unsubscribed
        if (channel.state !== 'closed') {
          await supabase.removeChannel(channel);
        }
      } catch (error) {
        console.error('[REALTIME MANAGER] Error during cleanup:', error);
      }
      
      channelRef.current = null;
      setIsConnected(false);
      currentProjectRef.current = null;
      isSubscribingRef.current = false;
      console.log('[REALTIME MANAGER] Cleanup completed');
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
    // Update callbacks immediately
    callbacksRef.current = callbacks;
    
    // If we're already subscribed to this project, just update callbacks and return
    if (currentProjectRef.current === projectId && channelRef.current && isConnected) {
      console.log(`[REALTIME MANAGER] Already connected to project ${projectId}, updating callbacks only`);
      return;
    }

    // Prevent concurrent subscriptions
    if (isSubscribingRef.current) {
      console.log('[REALTIME MANAGER] Subscription in progress, skipping');
      return;
    }

    isSubscribingRef.current = true;
    const channelName = `kanban-project-${projectId || 'global'}`;
    
    console.log(`[REALTIME MANAGER] Subscribing to project: ${projectId}`);

    // Clean up existing subscription
    await unsubscribeFromProject();
    
    try {
      currentProjectRef.current = projectId;
      
      const newChannel = supabase.channel(channelName, {
        config: { broadcast: { ack: false } },
      });

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
        console.log(`[REALTIME MANAGER] Channel ${channelName} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          isSubscribingRef.current = false;
          console.log(`[REALTIME MANAGER] Successfully subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('[REALTIME MANAGER] Channel subscription failed:', err);
          setIsConnected(false);
          isSubscribingRef.current = false;
          
          // Only cleanup if this is still our current channel
          if (channelRef.current === newChannel) {
            unsubscribeFromProject();
          }
        }
      });

    } catch (error) {
      console.error('[REALTIME MANAGER] Error during subscription:', error);
      isSubscribingRef.current = false;
      setIsConnected(false);
    }
  }, [unsubscribeFromProject, isConnected]);

  useEffect(() => {
    return () => {
      console.log("[REALTIME MANAGER] Provider unmounting, cleaning up");
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
