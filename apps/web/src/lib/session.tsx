"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setAccessToken } from "./api";

interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  memberships: {
    role: string;
    organization: { id: string; name: string; slug: string; logoUrl: string | null };
  }[];
}

interface Session {
  me: Me;
  /** Organización activa (la primera membresía; selector multi-org en v2). */
  orgId: string;
  orgName: string;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fuera de SessionProvider");
  return ctx;
}

/**
 * Bootstrap de sesión del shell privado: recupera el access token con la
 * cookie httpOnly (POST /auth/refresh) y carga el perfil. Mientras tanto
 * no renderiza el contenido (el middleware ya garantizó que hay cookie).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { accessToken } = await api<{ accessToken: string }>("/auth/refresh", {
          method: "POST",
        });
        setAccessToken(accessToken);
        const me = await api<Me>("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const org = me.memberships[0]?.organization;
        if (!org) throw new Error("Sin organización");
        if (!cancelled) {
          setSession({
            me,
            orgId: org.id,
            orgName: org.name,
            logout: async () => {
              await api("/auth/logout", { method: "POST" }).catch(() => undefined);
              setAccessToken(null);
              router.push("/login");
              router.refresh();
            },
          });
        }
      } catch {
        if (!cancelled) {
          router.push("/login");
          router.refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const value = useMemo(() => session, [session]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex size-10 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
            ⚽
          </span>
          <p className="text-sm text-foreground-muted">Cargando tu organización…</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContext.Provider>
  );
}
