import { createClient } from "@/lib/db/supabaseClient";

export async function signInWithGoogle() {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getSession() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}
