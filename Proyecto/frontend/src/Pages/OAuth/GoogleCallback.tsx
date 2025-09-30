import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

type MessagePayload = {
  token?: string;
  user?: unknown;
  next?: string;
  payload?: MessagePayload;
  data?: MessagePayload;
};

type LocationState = { next?: string } | null;

type Status = "loading" | "error";

const LOADING_MESSAGE = "Procesando autenticación con Google…";

function extractPayload(candidate: MessagePayload | undefined): MessagePayload | null {
  if (!candidate) return null;
  if (candidate.token && candidate.user) return candidate;
  if (candidate.payload) return extractPayload(candidate.payload as MessagePayload);
  if (candidate.data) return extractPayload(candidate.data as MessagePayload);
  return null;
}

function parseUser(raw: unknown): unknown | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }

  if (typeof raw === "object") {
    return raw;
  }

  return null;
}

type NextResolution = {
  resolved: string;
  original: string | null;
};

type OAuthJwtPayload = {
  token?: unknown;
  user?: unknown;
};

function parseOAuthJwt(raw: string | null): { token: string; user: unknown } | null {
  if (!raw) return null;

  const [, middle] = raw.split(".");
  if (!middle) return null;

  const normalized = middle.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  try {
    const decoded = atob(padded)
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("");
    const parsed = JSON.parse(decodeURIComponent(decoded)) as OAuthJwtPayload;
    if (typeof parsed.token === "string" && parsed.user !== undefined) {
      return { token: parsed.token, user: parsed.user };
    }
  } catch {
    return null;
  }

  return null;
}

function ensureSafePath(candidate: string | null): string | null {
  if (!candidate) return null;
  return candidate.startsWith("/") ? candidate : null;
}

function resolveNext(locationState: LocationState, search: string): NextResolution {
  const params = new URLSearchParams(search);
  const nextFromQuery = ensureSafePath(params.get("next"));
  if (nextFromQuery) {
    return { resolved: nextFromQuery, original: nextFromQuery };
  }

  const rawState = params.get("state");
  if (rawState) {
    try {
      const decoded = decodeURIComponent(rawState);
      const safeDecoded = ensureSafePath(decoded);
      if (safeDecoded) {
        return { resolved: safeDecoded, original: safeDecoded };
      }
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object" && typeof parsed.next === "string") {
        const candidate = ensureSafePath(parsed.next);
        if (candidate) {
          return { resolved: candidate, original: candidate };
        }
      }
    } catch {
      const safeRaw = ensureSafePath(rawState);
      if (safeRaw) {
        return { resolved: safeRaw, original: safeRaw };
      }
    }
  }

  const fromState = ensureSafePath(locationState?.next ?? null);
  if (fromState) {
    return { resolved: fromState, original: fromState };
  }

  return { resolved: "/profile", original: null };
}

export default function GoogleCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState;
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(LOADING_MESSAGE);

  const { resolved: next, original: originalNext } = useMemo(
    () => resolveNext(locationState, location.search),
    [locationState, location.search],
  );

  useEffect(() => {
    let handled = false;
    const params = new URLSearchParams(location.search);
    const queryPayload = params.get("payload");
    const timeoutRef: { current: number | null } = { current: null };

    const fail = (reason: string) => {
      if (handled) return;
      handled = true;
      setStatus("error");
      setMessage(reason);
      const loginUrl = originalNext ? `/login?next=${encodeURIComponent(originalNext)}` : "/login";
      navigate(loginUrl, { replace: true, state: { notice: reason } });
    };

    const succeed = (token: string, user: unknown) => {
      if (handled) return;
      handled = true;
      setMessage("Sesión verificada. Redirigiendo…");
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }      
      try {
        useAuthStore.getState().acceptOAuthSession({ token, user });
      } catch (error) {
        fail("No se pudo guardar la sesión de Google. Intenta nuevamente.");
        return;
      }
      navigate(next, { replace: true });
    };

    if (queryPayload) {
      const parsedPayload = parseOAuthJwt(queryPayload);
      if (!parsedPayload) {
        fail("Los datos recibidos de Google son inválidos.");
        return () => {
          handled = true;
        };
      }
      succeed(parsedPayload.token, parsedPayload.user);
      return () => {
        handled = true;
      };
    }

    const attemptFromQuery = () => {
      const queryToken = params.get("token");
      const queryUser = params.get("user");

      if (!queryToken || !queryUser) return false;

      const parsedUser = parseUser(queryUser);
      if (!parsedUser) {
        fail("Los datos recibidos de Google son inválidos.");
        return true;
      }

      succeed(queryToken, parsedUser);
      return true;
    };

    if (attemptFromQuery()) {
      return () => {
        handled = true;
      };
    }

    const handleMessage = (event: MessageEvent<MessagePayload>) => {
      if (handled) return;
      const payload = extractPayload(event.data);
      if (!payload) return;
      const { token, user } = payload;
      if (typeof token !== "string") {
        fail("Respuesta de Google incompleta: falta el token.");
        return;
      }
      const parsedUser = parseUser(user);
      if (!parsedUser) {
        fail("Respuesta de Google incompleta: falta el usuario.");
        return;
      }
      succeed(token, parsedUser);
    };

    window.addEventListener("message", handleMessage);

    timeoutRef.current = window.setTimeout(() => {
      if (!handled) {
        fail("No se recibieron datos de autenticación. Intenta iniciar sesión otra vez.");
      }
    }, 5000);

    return () => {
      handled = true;
      window.removeEventListener("message", handleMessage);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [location.search, navigate, next]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#081126",
        color: "#f5f7ff",
        textAlign: "center",
        fontFamily: '"Press Start 2P", system-ui, sans-serif',
      }}
    >
      <div>
        <p role="status" style={{ marginBottom: "1rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {message}
        </p>
        {status === "loading" && (
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              gap: "0.5rem",
              alignItems: "center",
              fontSize: "0.85rem",
            }}
          >
            <span className="spinner" style={{ animation: "spin 1.1s linear infinite" }}>
              ⏳
            </span>
            <span>Esperando confirmación…</span>
          </div>
        )}
      </div>
    </main>
  );
}
