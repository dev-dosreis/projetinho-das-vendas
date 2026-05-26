import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isConfigured(value: string | undefined): value is string {
  return Boolean(
    value &&
    !value.includes("SEU_PROJECT_REF") &&
    !value.includes("replace_me")
  );
}

export function hasSupabaseEnv() {
  return (
    isConfigured(supabaseUrl) &&
    (isConfigured(supabaseAnonKey) || isConfigured(supabaseServiceKey))
  );
}

export function createReadClient() {
  if (!isConfigured(supabaseUrl) || !isConfigured(supabaseAnonKey)) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
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

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
