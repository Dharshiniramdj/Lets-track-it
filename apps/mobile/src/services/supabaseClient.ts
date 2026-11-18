import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SafeStorage } from './storage.service';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://fsbufvnmbctuvzbgskhe.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYnVmdm5tYmN0dXZ6Ymdza2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzA1MDIsImV4cCI6MjEwOTIwNjUwMn0.gGapAUVSv1sUjytFHJfhPpN-vq4_DppDiCj6Vd49sJQ';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_URL.includes('your-project')
  );
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web'
  }
});
