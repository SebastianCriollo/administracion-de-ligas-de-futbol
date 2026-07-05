import "server-only";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

/**
 * Fetch del portal público desde Server Components con ISR:
 * cada respuesta se revalida a los 60 s — SEO + frescura razonable
 * (decisión Fase 1 §5). Devuelve null en 404 para notFound().
 */
export async function publicApi<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}/public${path}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API pública ${res.status} en ${path}`);
  return (await res.json()) as T;
}
