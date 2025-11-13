import { useEffect, useState } from "react";

export function useBackendReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = false;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    (async () => {
      let delay = 300;
      while (!stop) {
        try {
          const response = await fetch("/api/health", { credentials: "include" });
          if (response.ok) {
            setReady(true);
            return;
          }
        } catch {
          // Ignoramos errores de red, se reintentará con backoff.
        }
        await wait(delay);
        delay = Math.min(delay * 2, 2000);
      }
    })();

    return () => {
      stop = true;
    };
  }, []);

  return ready;
}
