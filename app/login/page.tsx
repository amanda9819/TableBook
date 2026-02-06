"use client";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/client";
import { createClient } from "@/lib/db/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
      } else {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Table Book</h1>
        <p className="mt-2 text-muted-foreground">
          Save and organize your favorite restaurants
        </p>
      </div>

      <Button onClick={handleSignIn} size="lg">
        Continue with Google
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </main>
  );
}
