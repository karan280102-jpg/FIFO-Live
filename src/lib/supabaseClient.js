import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configMissing = !supabaseUrl || !supabaseAnonKey;

// If env vars are missing (e.g. forgot to set them in Vercel), export a client
// pointed at placeholder values so the app doesn't crash at import time —
// App.jsx checks `configMissing` and shows a clear setup message instead.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
