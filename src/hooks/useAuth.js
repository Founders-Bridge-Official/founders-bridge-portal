import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [companies,     setCompanies]     = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading,       setLoading]       = useState(true);

  async function loadUserData(authUser) {
    if (!authUser) {
      setProfile(null); setCompanies([]); setActiveCompany(null);
      return;
    }
    const { data: profileData } = await supabase
      .from('users').select('*').eq('auth_uid', authUser.id).single();
    setProfile(profileData ?? null);
    if (profileData) {
      const { data: ucRows } = await supabase
        .from('user_companies')
        .select(`role, is_primary, companies(id, name, type, status, assigned_to)`)
        .eq('user_id', profileData.id);
      const companyList = (ucRows ?? []).map(row => ({ ...row.companies, role: row.role, is_primary: row.is_primary }));
      setCompanies(companyList);
      const primary = companyList.find(c => c.is_primary) ?? companyList[0] ?? null;
      setActiveCompany(primary);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadUserData(session?.user ?? null).finally(() => setLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      await loadUserData(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithOtp(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/login' },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setCompanies([]); setActiveCompany(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, companies, activeCompany, setActiveCompany, signInWithPassword, signInWithOtp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}