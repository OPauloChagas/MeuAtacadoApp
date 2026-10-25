import { describe, expect, it } from "vitest";
import { readPublicSupabaseConfig } from "./env";

const publicKey = "sb_publishable_fictional_test_value";
const config = (url: string, key = publicKey) => ({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
});
const fictionalJwt = (role: string) =>
  `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ role }))}.fictional-signature`;

describe("configuração pública Supabase", () => {
  it("aceita URL HTTPS e chave publishable", () => {
    expect(readPublicSupabaseConfig(config("https://example.supabase.co/")))
      .toEqual({ url: "https://example.supabase.co", publishableKey: publicKey });
  });
  it.each(["localhost", "127.0.0.1", "[::1]"])("aceita HTTP local em %s", (host) => {
    expect(readPublicSupabaseConfig(config(`http://${host}:54321`)).url)
      .toBe(`http://${host}:54321`);
  });
  it("aceita a chave anon legada do ambiente local", () => {
    const key = fictionalJwt("anon");
    expect(readPublicSupabaseConfig(config("http://127.0.0.1:54321", key)).publishableKey).toBe(key);
  });
  it.each([undefined, ""])("recusa configuração ausente (%s)", (value) => {
    expect(() => readPublicSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: value })).toThrow("Configure");
  });
  it.each([
    "<supabase-api-url>", "http://remote.example.com", "ftp://localhost",
    "https://user:password@example.com", "https://example.com/?token=private",
    "https://example.com/#private", "https://example.com/path",
  ])("recusa URL inválida ou insegura sem revelar seu conteúdo: %s", (url) => {
    expect(() => readPublicSupabaseConfig(config(url))).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    try { readPublicSupabaseConfig(config(url)); } catch (error) {
      expect(String(error)).not.toContain(url);
    }
  });
  it.each(["sb_secret_fictional_private", fictionalJwt("service_role"), "eyJ.invalid.jwt", "<key>"])(
    "recusa chave elevada, inválida ou placeholder sem revelá-la: %s", (key) => {
      expect(() => readPublicSupabaseConfig(config("https://example.supabase.co", key)))
        .toThrow("chaves administrativas são proibidas");
      try { readPublicSupabaseConfig(config("https://example.supabase.co", key)); } catch (error) {
        expect(String(error)).not.toContain(key);
      }
    },
  );
});
