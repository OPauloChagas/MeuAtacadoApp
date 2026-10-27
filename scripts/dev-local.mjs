import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

try {
  const config = JSON.parse(execFileSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  assert.equal(config.API_URL, "http://127.0.0.1:54321");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
    stdio: "inherit", env: { ...process.env, APP_URL: "http://127.0.0.1:3000", NEXT_PUBLIC_SUPABASE_URL: config.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.PUBLISHABLE_KEY ?? config.ANON_KEY,
      SUPABASE_SECRET_KEY:config.SERVICE_ROLE_KEY,SMTP_HOST:"127.0.0.1",SMTP_PORT:"54325",SMTP_FROM:"atacado@example.test",SMTP_USER:"",SMTP_PASSWORD:"" },
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
  child.on("error", () => { console.error("Não foi possível iniciar o Next.js local."); process.exitCode = 1; });
} catch { console.error("Inicie o Supabase Docker local antes de executar npm run dev:local."); process.exitCode = 1; }
