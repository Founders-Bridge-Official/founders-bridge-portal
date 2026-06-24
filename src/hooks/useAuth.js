// src/hooks/useAuth.js
// Central auth context. Wrap your app with <AuthProvider> and call useAuth() anywhere.
//
// Provides:
//   user          — Supabase Auth user (null if logged out)
//   profile       — row from public.users for the logged-in user
//   companies     — all companies this user belongs to (from user_companies)
//   activeCompany — currently selected company (auto-set if only one)
//   setActiveCompany(company) — switch active company
//   signInWithPassword(email, password)
//   signInWithOtp(email)      — sends magic link
//   signOut()
//   loading       — true while session is being resolved

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [companies,     setCompanies]     = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading,       setLoading]       = useState(true);

  // ─── helpers ──────────────────────────────────────────────────────────────────────────────

  async function loadUserData(authUser) {
    if (!authUser) {
      setProfile(null);
      setCompanies([]);
      setActiveCompany(null);
      localStorage.removeItem('fb_user');
      localStorage.removeItem('fb_view');
      return;
    }

    // ─── Bridge to legacy App.jsx auth system ──────────────────────────────────────────────
    // CRITICAL: Write fb_user BEFORE the first await so App.jsx always sees
    // a valid user when it mounts after login navigation. Without this, App.jsx
    // reads localStorage once on mount and finds null (the DB fetch hasn't
    // completed yet), causing a "wrong password" false error on first login.
    localStorage.setItem('fb_user', JSON.stringify({
      id: authUser.id,
      email: authUser.email,
      name: authUser.email,
      role: 'admin',
      mustChangePassword: false,
    }));

    // 1. Load profile from public.users (match on auth_uid)
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('auth_uid', authUser.id)
      .single();

    setProfile(profileData ?? null);

    // Update fb_user with real profile data from DB
    if (profileData) {
      localStorage.setItem('fb_user', JSON.stringify({
        id: profileData.id,
        email: profileData.email || authUser.email,
        name: profileData.name || profileData.email || authUser.email,
        role: profileData.role || 'admin',
        mustChangePassword: false,
      }));
    }
    // (if no profile row found, the initial write above remains valid)

    // 2. Load all companies for this user via user_companies junction table
    if (profileData) {
      const { data: ucRows } = await supabase
        .from('user_companies')
        .select(`
          role,
          is_primary,
          companies (
            id, name, type, status, assigned_to
          )
        `)
        .eq('user_id', profileData.id);

      const companyList = (ucRows ?? []).map(row => ({
        ...row.companies,
        role: row.role,
        is_primary: row.is_primary,
      }));

      setCompanies(companyList);

      // Auto-select: primary first, then first in list
      const primary = companyList.find(c => c.is_primary) ?? companyList[0] ?? null;
      setActiveCompany(primary);
    }
  }

  // ─── session lifecycle ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Get initial session (handles magic-link redirect on page load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadUserData(session?.user ?? null).finally(() => setLoading(false));
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        await loadUserData(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ─── auth actions ──────────────────────────────────────────────────────────────────────────────

  async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithOtp(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/login',
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    // Clear legacy auth keys first so App.jsx resets immediately
    localStorage.removeItem('fb_user');
    localStorage.removeItem('fb_view');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompanies([]);
    setActiveCompany(null);
  }

  // ─── context value ───────────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      companies,
      activeCompany,
      setActiveCompany,
      signInWithPassword,
      signInWithOtp,
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
