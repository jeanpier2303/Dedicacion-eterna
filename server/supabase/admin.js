import { createClient } from '@supabase/supabase-js';
import { requiredEnv } from '../config.js';

let client = null;

export function adminClient() {
  if (!client) {
    client = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SECRET_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
