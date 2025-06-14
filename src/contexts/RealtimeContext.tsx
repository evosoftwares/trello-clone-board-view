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
  const cleanupInProgress = useRef(false);

  const unsubscribeFromProject = useCallback(() => {
    if (cleanupInProgress.current) {
      // Já limpando, não faz nada
      return;
    }
    cleanupInProgress.current = true;

    if (channelRef.current) {
      try {
        const channel = channelRef.current;
        channelRef.current = null;
        // Remove listeners do canal
        channel.unsubscribe();
        supabase.removeChannel(channel);
        console.log('[REALTIME] Channel cleanup completed');
      } catch (error) {
        console.error('[REALTIME] Error during cleanup:', error);
      }
    }

    setIsConnected(false);
    currentProjectRef.current = null;
    callbacksRef.current = null;
    cleanupInProgress.current = false;
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
    // Se projeto não mudou, só atualiza callbacks
    if (currentProjectRef.current === projectId && channelRef.current && isConnected) {
      callbacksRef.current = callbacks;
      console.log('[REALTIME] Same project, callbacks updated only');
      return;
    }
    // Cleanup ANTES de criar qualquer outro canal
    unsubscribeFromProject();

    // Atualiza refs
    callbacksRef.current = callbacks;
    currentProjectRef.current = projectId;

    // Sempre crie um novo canal!
    const channelName = `kanban-project-${projectId || 'global'}-${Date.now()}`;
    console.log(`[REALTIME] Creating channel: ${channelName}`);
    const newChannel = supabase.channel(channelName);
    channelRef.current = newChannel;

    newChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const newTask = payload.new as Task;
        if (!currentProjectRef.current || newTask.project_id === currentProjectRef.current) {
          callbacksRef.current?.onTaskInsert(newTask);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        callbacksRef.current?.onTaskUpdate(payload.new as Task);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        callbacksRef.current?.onTaskDelete((payload.old as any).id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => {
        callbacksRef.current?.onDataChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        callbacksRef.current?.onDataChange();
      })
      .subscribe((status) => {
        console.log(`[REALTIME] Channel ${channelName} status:`, status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log(`[REALTIME] Successfully subscribed to ${channelName}`);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setIsConnected(false);
        }
      });
  }, [unsubscribeFromProject, isConnected]);

  useEffect(() => {
    return () => {
      unsubscribeFromProject();
    };
  }, [unsubscribeFromProject]);

  return (
    <RealtimeContext.Provider
      value={{
        subscribeToProject,
        unsubscribeFromProject,
        isConnected,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
