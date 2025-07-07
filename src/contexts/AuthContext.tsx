
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
          // Não retornar aqui, continuar o processo
        }

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setInitialized(true);
          
          if (currentSession?.user) {
            try {
              await handleAuthUser(currentSession.user);
            } catch (userError) {
              logger.error('Error handling auth user during initialization', userError);
              setLoading(false);
            }
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
      logger.info(`[AUTH] onAuthStateChange event: ${event}`, { hasSession: !!newSession });
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      try {
        if (newSession?.user) {
          await handleAuthUser(newSession.user);
        } else {
          // Garante que o perfil seja limpo se não houver sessão
          setProfile(null);
        }
      } catch (error) {
        logger.error(`[AUTH] Error handling user on ${event} event`, error);
        setProfile(null);
      } finally {
        // ESSENCIAL: Garante que o loading seja finalizado em todos os casos
        setLoading(false);
      }
    });

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfileExists]);

  const signIn = async (email: string, password: string) => {
    try {
      logger.debug('Attempting sign in for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        logger.error('Sign in error from Supabase:', error);
        return { error };
      }
      
      logger.debug('Sign in successful:', data.user?.email);
      return { error: null };
    } catch (err: any) {
      logger.error('Sign in exception:', err);
      return { error: err };
    } finally {
      // Não definir loading como false aqui, deixar o onAuthStateChange cuidar disso
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
