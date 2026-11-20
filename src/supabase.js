import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.warn('[Supabase Warning] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

// Create a Supabase client with the service role key to bypass RLS in backend functions
export const supabase = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseServiceRoleKey || 'placeholder-service-role-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);
