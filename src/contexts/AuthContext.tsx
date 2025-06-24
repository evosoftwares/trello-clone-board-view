
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, Profile } from '@/types/auth';
import { useManualProfileCreation } from '@/hooks/useManualProfileCreation';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AUTH');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const { ensureProfileExists } = useManualProfileCreation();
  const initializingRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      logger.debug('Fetching profile for user', userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching profile', error);
        return null;
      }

      if (profileData) {
        logger.debug('Profile found', profileData);
        setProfile(profileData as Profile);
        return profileData as Profile;
      }

      return null;
    } catch (err) {
      logger.error('Profile fetch failed', err);
      return null;
    }
  };

  const handleAuthUser = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      logger.debug('Handling auth user', currentUser.email);
      
      // Tentar buscar perfil existente primeiro
      let profileData = await fetchProfile(currentUser.id);
      
      // Se não encontrou, tentar criar
      if (!profileData) {
        logger.debug('Profile not found, creating');
        profileData = await ensureProfileExists(currentUser);
        
        if (profileData) {
          setProfile(profileData);
        }
      }
    } catch (err) {
      logger.error('Error handling auth user', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Evitar múltiplas inicializações
    if (initializingRef.current) {
      return;
    }
    
    initializingRef.current = true;

    const initializeAuth = async () => {
      try {
        logger.debug('Initializing auth');
        
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error getting session', error);
        }

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setInitialized(true);
          
          if (currentSession?.user) {
            await handleAuthUser(currentSession.user);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        logger.error('Initialization error', err);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        initializingRef.current = false;
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted || !initialized) return;

      logger.debug('Auth state changed', { event, email: newSession?.user?.email });
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await handleAuthUser(newSession.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfileExists, initialized]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (err: any) {
      logger.error('Sign in error', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      return { error };
    } catch (err: any) {
      logger.error('Sign up error', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setInitialized(false);
        initializingRef.current = false;
      }
      return { error };
    } catch (err: any) {
      logger.error('Sign out error', err);
      return { error: err };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
