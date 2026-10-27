import assert from "node:assert/strict";
import { execFileSync,spawnSync } from "node:child_process";
import { mkdtempSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const output=mkdtempSync(join(tmpdir(),"meuatacado-admin-"));
try {
  const local=JSON.parse(execFileSync("node_modules/.bin/supabase",["status","--output","json"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
  assert.equal(local.API_URL,"http://127.0.0.1:54321");
  const result=spawnSync(process.execPath,["node_modules/@playwright/test/cli.js","test","--config=playwright.admin.config.ts"],{
    stdio:"inherit",env:{...process.env,AUTH_E2E_LOCAL:"1",AUTH_E2E_OUTPUT:output,APP_URL:"http://127.0.0.1:3100",
      NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY??local.ANON_KEY,
      SUPABASE_SECRET_KEY:local.SERVICE_ROLE_KEY,SMTP_HOST:"127.0.0.1",SMTP_PORT:"54325",SMTP_FROM:"atacado@example.test",SMTP_USER:"",SMTP_PASSWORD:""},
  });
  process.exitCode=result.status??1;
} catch { console.error("Admin E2E exige Supabase Docker local, migrations aplicadas e SMTP em 54325. Nenhum ambiente remoto foi utilizado.");process.exitCode=1; }
finally {rmSync(output,{recursive:true,force:true});}
