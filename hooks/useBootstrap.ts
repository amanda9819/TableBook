"use client";

import { useEffect, useState } from "react";

type BootstrapResult = {
  ok: boolean;
  listId?: string;
  created?: boolean;
  error?: string;
};

export function useBootstrap(isAuthenticated: boolean) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [result, setResult] = useState<BootstrapResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const bootstrap = async () => {
      setStatus("loading");

      try {
        const res = await fetch("/api/bootstrap", {
          method: "POST",
        });

        const data = await res.json();

        if (res.ok) {
          setResult(data);
          setStatus("done");
        } else {
          setResult({ ok: false, error: data.error });
          setStatus("error");
        }
      } catch (err) {
        console.error("Bootstrap error:", err);
        setResult({ ok: false, error: "Network error" });
        setStatus("error");
      }
    };

    bootstrap();
  }, [isAuthenticated]);

  return { status, result };
}
