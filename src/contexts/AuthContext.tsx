
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, Profile } from '@/types/auth';
import { useManualProfileCreation } from '@/hooks/useManualProfileCreation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const { ensureProfileExists } = useManualProfileCreation();

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log(`[AUTH] Fetching profile for user: ${userId} (attempt ${retryCount + 1})`);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Error fetching profile:', error);
        if (retryCount < 2) {
          console.log('[AUTH] Retrying profile fetch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        throw error;
      }

      if (profileData) {
        console.log('[AUTH] Profile found:', profileData);
        setProfile(profileData as Profile);
        return profileData as Profile;
      }

      return null;
    } catch (err) {
      console.error('[AUTH] Profile fetch failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      console.log('[AUTH] Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      setProfileChecked(false);

      if (session?.user && !profileChecked) {
        try {
          setLoading(true);
          
          // Tentar buscar perfil existente primeiro
          let profileData = await fetchProfile(session.user.id);
          
          // Se não encontrou, tentar criar
          if (!profileData) {
            console.log('[AUTH] Profile not found, creating...');
            profileData = await ensureProfileExists(session.user);
            
            if (profileData) {
              setProfile(profileData);
            }
          }
          
          setProfileChecked(true);
        } catch (err) {
          console.error('[AUTH] Profile management error:', err);
          setProfile(null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else if (!session?.user) {
        setProfile(null);
        setProfileChecked(false);
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AUTH] Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user && !profileChecked) {
          await handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH] Initialization error:', err);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfileExists, profileChecked]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (err: any) {
      console.error('[AUTH] Sign in error:', err);
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
      console.error('[AUTH] Sign up error:', err);
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
        setProfileChecked(false);
      }
      return { error };
    } catch (err: any) {
      console.error('[AUTH] Sign out error:', err);
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
