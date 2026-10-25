type Environment = Readonly<Record<string, string | undefined>>;

export type PublicSupabaseConfig = Readonly<{ url: string; publishableKey: string }>;

/** Chamar somente ao integrar Supabase; F0 compila sem configuração externa. */
export function readPublicSupabaseConfig(environment: Environment): PublicSupabaseConfig {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida.");
  }

  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  if ((parsedUrl.protocol !== "https:" && !(localHost && parsedUrl.protocol === "http:")) ||
      parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash ||
      parsedUrl.pathname !== "/") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL exige HTTPS ou HTTP local, sem credenciais, caminho ou parâmetros.");
  }

  // Chaves legadas locais são JWTs anon. A leitura do papel é apenas uma barreira
  // de configuração, nunca validação de assinatura/sessão nem autorização.
  let legacyAnon = false;
  if (publishableKey.startsWith("eyJ")) {
    try {
      const parts = publishableKey.split(".");
      const payload: unknown = JSON.parse(atob((parts[1] ?? "").replaceAll("-", "+").replaceAll("_", "/")));
      legacyAnon = parts.length === 3 && Boolean(parts[2]) && typeof payload === "object" &&
        payload !== null && "role" in payload && payload.role === "anon";
    } catch {
      legacyAnon = false;
    }
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey) && !legacyAnon) {
    throw new Error("Use apenas chave pública publishable ou anon; chaves administrativas são proibidas.");
  }

  return { url: parsedUrl.origin, publishableKey };
}
