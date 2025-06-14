
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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const unsubscribeFromProject = useCallback(() => {
    console.log('[REALTIME] Starting cleanup');
    
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    
    if (channelRef.current) {
      try {
        // Remove the channel immediately and synchronously
        const channel = channelRef.current;
        channelRef.current = null;
        
        // Unsubscribe from the channel
        channel.unsubscribe();
        
        // Remove from supabase client
        supabase.removeChannel(channel);
        
        console.log('[REALTIME] Channel cleanup completed');
      } catch (error) {
        console.error('[REALTIME] Error during cleanup:', error);
      }
    }
    
    setIsConnected(false);
    currentProjectRef.current = null;
    callbacksRef.current = null;
  }, []);

  const subscribeToProject = useCallback((
    projectId: string | null,
    callbacks: {
      onTaskInsert: (task: Task) => void;
      onTaskUpdate: (task: Task) => void;
      onTaskDelete: (taskId: string) => void;
      onDataChange: () => void;
    }
  ) => {
    // If same project, just update callbacks
    if (currentProjectRef.current === projectId && channelRef.current && isConnected) {
      console.log('[REALTIME] Same project, updating callbacks only');
      callbacksRef.current = callbacks;
      return;
    }

    // Clean up existing subscription first
    unsubscribeFromProject();
    
    // Wait a bit to ensure cleanup is complete
    cleanupTimeoutRef.current = setTimeout(() => {
      try {
        // Update refs
        callbacksRef.current = callbacks;
        currentProjectRef.current = projectId;
        
        const channelName = `kanban-project-${projectId || 'global'}`;
        console.log(`[REALTIME] Creating channel: ${channelName}`);

        const newChannel = supabase.channel(channelName);
        channelRef.current = newChannel;

        newChannel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('[REALTIME] Task INSERT:', payload.new);
            const newTask = payload.new as Task;
            if (!currentProjectRef.current || newTask.project_id === currentProjectRef.current) {
              callbacksRef.current?.onTaskInsert(newTask);
            }
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('[REALTIME] Task UPDATE:', payload.new);
            callbacksRef.current?.onTaskUpdate(payload.new as Task);
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
            console.log('[REALTIME] Task DELETE:', payload.old);
            callbacksRef.current?.onTaskDelete((payload.old as any).id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
            console.log('[REALTIME] Columns changed');
            callbacksRef.current?.onDataChange();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
            console.log('[REALTIME] Team members changed');
            callbacksRef.current?.onDataChange();
          })
          .subscribe((status) => {
            console.log(`[REALTIME] Channel ${channelName} status:`, status);
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              console.log(`[REALTIME] Successfully subscribed to ${channelName}`);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.error(`[REALTIME] Channel subscription failed: ${status}`);
              setIsConnected(false);
            }
          });

      } catch (error) {
        console.error('[REALTIME] Error during subscription:', error);
        setIsConnected(false);
      }
    }, 100); // Small delay to ensure cleanup completes
  }, [unsubscribeFromProject, isConnected]);

  useEffect(() => {
    return () => {
      console.log("[REALTIME] Provider cleanup");
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      unsubscribeFromProject();
    };
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
