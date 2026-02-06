"use client";

import { createClient } from "@/lib/db/supabaseClient";
import { useEffect, useState } from "react";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? null);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    getUser();
  }, []);

  return { isLoading, isAuthenticated, userId, email };
}
