
import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const channelRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const currentProjectRef = useRef<string | null>(null);
  const callbacksRef = useRef<any>(null);
  const subscriptionPromiseRef = useRef<Promise<void> | null>(null);

  const forceCleanup = async () => {
    console.log("[REALTIME MANAGER] Force cleanup started");
    
    if (channelRef.current) {
      try {
        // Força desconexão imediata
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      } catch (error) {
        console.warn("[REALTIME MANAGER] Cleanup error:", error);
      }
    }

    isConnectedRef.current = false;
    currentProjectRef.current = null;
    callbacksRef.current = null;
    subscriptionPromiseRef.current = null;

    // Aguarda um ciclo de event loop para garantir cleanup
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log("[REALTIME MANAGER] Force cleanup completed");
  };

  const subscribeToProject = async (
    projectId: string | null,
    callbacks: {
      onTaskInsert: (task: Task) => void;
      onTaskUpdate: (task: Task) => void;
      onTaskDelete: (taskId: string) => void;
      onDataChange: () => void;
    }
  ) => {
    console.log("[REALTIME MANAGER] Subscribe request for project:", projectId);

    // Se já estamos conectados ao mesmo projeto, apenas atualiza callbacks
    if (currentProjectRef.current === projectId && isConnectedRef.current && channelRef.current) {
      console.log("[REALTIME MANAGER] Updating callbacks for same project");
      callbacksRef.current = callbacks;
      return;
    }

    // Aguarda subscription anterior se existir
    if (subscriptionPromiseRef.current) {
      console.log("[REALTIME MANAGER] Waiting for previous subscription to complete");
      await subscriptionPromiseRef.current;
    }

    // Força cleanup completo
    await forceCleanup();

    // Cria nova subscription
    subscriptionPromiseRef.current = createSubscription(projectId, callbacks);
    await subscriptionPromiseRef.current;
  };

  const createSubscription = async (
    projectId: string | null,
    callbacks: {
      onTaskInsert: (task: Task) => void;
      onTaskUpdate: (task: Task) => void;
      onTaskDelete: (taskId: string) => void;
      onDataChange: () => void;
    }
  ) => {
    return new Promise<void>((resolve, reject) => {
      console.log("[REALTIME MANAGER] Creating subscription for project:", projectId);

      const channelName = `kanban-${projectId || 'all'}-${Date.now()}`;
      console.log("[REALTIME MANAGER] Channel name:", channelName);

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[REALTIME MANAGER] Task INSERT:', payload.new);
          const newTask = payload.new as Task;
          if (!projectId || newTask.project_id === projectId) {
            callbacksRef.current?.onTaskInsert(newTask);
          }
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[REALTIME MANAGER] Task UPDATE:', payload.new);
          const updatedTask = payload.new as Task;
          callbacksRef.current?.onTaskUpdate(updatedTask);
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'tasks' 
        }, (payload) => {
          console.log('[REALTIME MANAGER] Task DELETE:', payload.old);
          callbacksRef.current?.onTaskDelete((payload.old as any).id);
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'kanban_columns' 
        }, () => {
          console.log('[REALTIME MANAGER] Columns changed');
          callbacksRef.current?.onDataChange();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_members' 
        }, () => {
          console.log('[REALTIME MANAGER] Team members changed');
          callbacksRef.current?.onDataChange();
        });

      channelRef.current = channel;
      currentProjectRef.current = projectId;
      callbacksRef.current = callbacks;

      channel.subscribe((status: string) => {
        console.log("[REALTIME MANAGER] Subscription status:", status);
        
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          console.log("[REALTIME MANAGER] Successfully subscribed");
          resolve();
        } else if (status === 'CHANNEL_ERROR') {
          console.error("[REALTIME MANAGER] Channel error");
          isConnectedRef.current = false;
          reject(new Error('Channel subscription failed'));
        } else if (status === 'CLOSED') {
          console.log("[REALTIME MANAGER] Channel closed");
          isConnectedRef.current = false;
        }
      });
    });
  };

  const unsubscribeFromProject = async () => {
    console.log("[REALTIME MANAGER] Unsubscribe request");
    await forceCleanup();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[REALTIME MANAGER] Provider unmounting, cleaning up");
      forceCleanup();
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        subscribeToProject,
        unsubscribeFromProject,
        isConnected: isConnectedRef.current
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
