
export interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: any;
  profile: Profile | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}
