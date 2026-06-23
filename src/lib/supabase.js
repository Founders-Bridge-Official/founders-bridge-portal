import { createClient } from '@supabase/supabase-js';

// Anon key is safe to commit — it's a public read-only key protected by RLS.
// Override via REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY in .env.local
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
  || 'https://suodxuignbbsxmqrfagx.supabase.co';

const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2R4dWlnbmJic3htcXJmYWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzI2MzAsImV4cCI6MjA5NjE0ODYzMH0.pQVau8xGbgQzVl7JijINms2ZEuaKzXmSQpwWS8jpbaY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:      true,
    autoRefreshToken:    true,
    detectSessionInUrl:  true,  // picks up magic-link tokens from the URL
  },
});
