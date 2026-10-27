/** Ephemeral local test configuration; never rewrites .env.local. */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const output = mkdtempSync(join(tmpdir(), "meuatacado-auth-"));
try {
  const status = JSON.parse(execFileSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const url = new URL(status.API_URL);
  assert.equal(url.origin, "http://127.0.0.1:54321", "Auth E2E exige Supabase Docker local.");
  const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.auth.config.ts"], {
    stdio: "inherit",
    env: { ...process.env, AUTH_E2E_LOCAL: "1", AUTH_E2E_OUTPUT: output, APP_URL: "http://127.0.0.1:3100", NEXT_PUBLIC_SUPABASE_URL: url.origin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY },
  });
  process.exitCode = result.status ?? 1;
} catch {
  console.error("Não foi possível executar Auth E2E. Verifique Node 24, Docker e Supabase local iniciado; nenhuma configuração remota foi utilizada.");
  process.exitCode = 1;
} finally { rmSync(output, { recursive: true, force: true }); }
