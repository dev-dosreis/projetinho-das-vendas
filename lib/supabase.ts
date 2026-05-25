import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isConfigured(value: string | undefined) {
  return Boolean(value && !value.includes("SEU_PROJECT_REF") && !value.includes("replace_me"));
}

export function hasSupabaseEnv() {
  return isConfigured(supabaseUrl) && (isConfigured(supabaseServiceKey) || isConfigured(supabasePublishableKey));
}

export function createReadClient() {
  const key = isConfigured(supabaseServiceKey) ? supabaseServiceKey : supabasePublishableKey;

  if (!isConfigured(supabaseUrl) || !isConfigured(key)) {
    return null;
  }

  return createClient(supabaseUrl as string, key as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
}

export function createServiceClient() {
  if (!isConfigured(supabaseUrl) || !isConfigured(supabaseServiceKey)) {
    return null;
  }

  return createClient(supabaseUrl as string, supabaseServiceKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
