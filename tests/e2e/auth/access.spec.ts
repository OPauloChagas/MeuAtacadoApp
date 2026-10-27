import { expect, test, type Page } from "@playwright/test";
import { sql, type Fixtures } from "./setup";

const fixture = () => JSON.parse(process.env.E2E_IDENTITY_FIXTURES ?? "null") as Fixtures;
async function login(page: Page, actor: keyof Fixtures["actors"], password = fixture().password) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture().actors[actor].email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /^Sair( da conta)?$/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/identity/context")).status()).toBe(401);
}

test("login, origem, cookies adulterados, admin/seller/buyer e revogação", async ({ page, context }) => {
  const f = fixture();
  await page.goto("/empresa/inicio");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "adminA");
  await expect(page).toHaveURL(/\/empresa\/inicio$/);
  await expect(page.getByRole("navigation")).toContainText("Minha empresa");
  const own = await page.request.get(`/api/identity/company?tenant_id=${f.tenantB}`);
  expect(own.status()).toBe(200);
  const ownBody = await own.json();
  expect(ownBody.data.tradeName).toBe(f.companyA);
  expect(ownBody.requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(own.headers()["cache-control"]).toContain("no-store");
  expect(own.headers()["cache-control"]).not.toContain("public");
  const cookies = await context.cookies();
  expect(cookies.filter((c) => c.name.startsWith("atacado-session") || c.name === "atacado-context").every((c) => c.httpOnly && c.sameSite === "Lax")).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  // Force the SDK's stored expiry into the past while preserving the real
  // refresh token. The proxy must renew via Auth and persist the new cookies.
  const sessionCookies = cookies.filter((c) => /^atacado-session(?:\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const encoded = sessionCookies.map((c) => c.value).join("");
  expect(encoded.startsWith("base64-")).toBe(true);
  const stored = JSON.parse(Buffer.from(encoded.slice(7), "base64url").toString("utf8"));
  stored.expires_at = Math.floor(Date.now() / 1000) - 60;
  const expired = `base64-${Buffer.from(JSON.stringify(stored)).toString("base64url")}`;
  let offset = 0;
  await context.addCookies(sessionCookies.map((cookie, index) => {
    const value = index === sessionCookies.length - 1 ? expired.slice(offset) : expired.slice(offset, offset + cookie.value.length);
    offset += cookie.value.length;
    return { ...cookie, value };
  }));
  expect((await page.request.get("/api/identity/context")).status()).toBe(200);
  const renewed = (await context.cookies()).filter((c) => /^atacado-session(?:\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => c.value).join("");
  expect(JSON.parse(Buffer.from(renewed.slice(7), "base64url").toString("utf8")).expires_at > Date.now() / 1000).toBe(true);
  const csrf = await page.request.post("/auth/context", { headers: { Origin: "https://invasor.example" }, form: { membership_id: f.memberAdminA }, maxRedirects: 0 });
  expect(csrf.status()).toBe(403);
  expect((await csrf.json()).error.code).toBe("FORBIDDEN");
  expect((await page.request.post("/auth/logout", { headers: { Origin: "https://invasor.example" }, maxRedirects: 0 })).status()).toBe(403);
  expect((await page.request.get("/auth/logout")).status()).toBe(405);
  const foreign = await page.request.post("/auth/context", { headers: { Origin: "http://127.0.0.1:3100" }, form: { membership_id: f.memberAdminB }, maxRedirects: 0 });
  expect(foreign.status()).toBe(403);
  await context.addCookies([{ name: "atacado-context", value: f.memberAdminB, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
  expect((await page.request.get("/api/identity/context")).status()).toBe(403);
  await page.goto("/empresa/configuracoes");
  await expect(page).toHaveURL(/\/selecionar-acesso$/);
  await logout(page);
  await login(page, "seller");
  await expect(page).toHaveURL(/\/empresa\/inicio$/);
  await expect(page.getByRole("navigation")).not.toContainText("Minha empresa");
  expect((await page.request.get("/api/identity/company")).status()).toBe(403);
  await page.goto("/empresa/configuracoes");
  await expect(page).toHaveURL(/\/acesso-negado$/);
  sql(`update public.memberships set status='inactive' where id='${f.memberSeller}';`);
  try {
    expect((await page.request.get("/api/identity/context")).status()).toBe(403);
    await page.goto("/empresa/inicio");
    await expect(page).toHaveURL(/\/sem-acesso$/);
  } finally { sql(`update public.memberships set status='active' where id='${f.memberSeller}';`); }
  await logout(page);
  await login(page, "buyer");
  await expect(page).toHaveURL(/\/cliente\/inicio$/);
  expect((await page.request.get("/api/identity/company")).status()).toBe(403);
  await expect(page.getByRole("navigation")).not.toContainText("Minha empresa");
  await expect(page.locator(".active-context")).toContainText(f.customerA);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("seleção explícita, troca sem dados anteriores, logout/login e conta sem vínculo", async ({ page }) => {
  const f = fixture();
  await login(page, "multi");
  await expect(page).toHaveURL(/\/selecionar-acesso$/);
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.getByRole("radio", { name: new RegExp(f.companyA) }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/cliente\/inicio$/);
  await expect(page.locator(".active-context")).toContainText(f.customerA);
  await page.getByRole("link", { name: "Trocar acesso" }).click();
  await page.getByRole("radio", { name: new RegExp(f.companyB) }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".active-context")).toContainText(f.companyB);
  await expect(page.getByRole("main")).not.toContainText(f.customerA);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const response = await page.request.get("/api/identity/context");
  expect((await response.json()).data.membership_id).toBe(f.memberMultiB);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await logout(page);
  await page.goBack();
  await expect(page.getByRole("main")).not.toContainText(f.customerB);
  await login(page, "buyer");
  await expect(page.locator(".active-context")).toContainText(f.companyA);
  await expect(page.getByRole("main")).not.toContainText(f.companyB);
  await logout(page);
  await login(page, "orphan");
  await expect(page).toHaveURL(/\/sem-acesso$/);
  await expect(page.getByRole("main")).toContainText("não possui um vínculo ativo");
});

test("erro de login genérico, teclado, responsividade e sessão falsificada", async ({ page, context }) => {
  await page.goto("/login?next=https://invasor.example");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByLabel("E-mail", { exact: true }).focus();
  await page.keyboard.type("inexistente-web@example.test");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  await page.keyboard.type("Senha-ficticia-incorreta-123");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Não foi possível entrar");
  const generic = await page.getByRole("main").getByRole("alert").textContent();
  await page.getByLabel("E-mail", { exact: true }).fill(fixture().actors.adminA.email);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(generic!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.addCookies([{ name: "atacado-session", value: "base64-eyJ1c2VyIjp7ImlkIjoiZm9yZ2VkIn19", url: "http://127.0.0.1:3100" }]);
  expect((await page.request.get("/api/identity/context")).status()).toBe(401);
  await page.goto("/empresa/inicio");
  await expect(page).toHaveURL(/\/login$/);
});
