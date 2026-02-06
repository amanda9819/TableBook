import { createClient } from "@/lib/db/supabaseServer";

export async function getServerSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireServerSession() {
  const user = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
