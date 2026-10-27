import { afterEach, describe, expect, it, vi } from "vitest";
import { identityConfigured, passwordRecoveryConfigured, readIdentityConfig } from "./config";

afterEach(() => vi.unstubAllEnvs());
describe("origem canônica para autenticação", () => {
  function configure(origin: string) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("APP_URL", origin);
  }
  it("aceita origem local e HTTPS e define Secure conforme o transporte", () => {
    configure("http://127.0.0.1:3000");
    expect(readIdentityConfig().secure).toBe(false);
    configure("https://atacado.example.test");
    expect(readIdentityConfig().secure).toBe(true);
  });
  it("rejeita origem ausente, caminho, parâmetros, credenciais e HTTP remoto", () => {
    for (const value of ["", "//example.test", "http://example.test", "https://example.test/path", "https://example.test?next=evil", "https://user:password@example.test", "https://example.test/#token"]) {
      configure(value);
      expect(identityConfigured()).toBe(false);
      expect(() => readIdentityConfig()).toThrow();
    }
  });
  it("só habilita recuperação com origem válida e opção ausente ou true", () => {
    configure("https://atacado.example.test");
    for (const value of [undefined, "true"]) {
      vi.stubEnv("AUTH_RECOVERY_ENABLED", value);
      expect(passwordRecoveryConfigured()).toBe(true);
    }
    for (const value of ["false", "invalid", ""]) {
      vi.stubEnv("AUTH_RECOVERY_ENABLED", value);
      expect(passwordRecoveryConfigured()).toBe(false);
    }
    vi.stubEnv("AUTH_RECOVERY_ENABLED", "true");
    vi.stubEnv("APP_URL", "");
    expect(passwordRecoveryConfigured()).toBe(false);
  });
});
