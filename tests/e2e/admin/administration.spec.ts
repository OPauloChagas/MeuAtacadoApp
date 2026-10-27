import { expect,test } from "@playwright/test";
import { randomUUID,randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { sql } from "../auth/setup";
import { fixtures,login,rpc,invitationLink,submitInvitation } from "./helpers";

test("admin edita empresa, preserva revisão e controla vínculos com último admin protegido",async({page})=>{
  const f=fixtures();await login(page,"adminA");await page.getByRole("link",{name:"Minha empresa",exact:true}).click();
  const name=`Empresa revisada ${randomBytes(3).toString("hex")}`;
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Razão social",{exact:false}).press("Tab");
  await expect(page.getByLabel("Nome fantasia",{exact:false})).toBeFocused();
  await page.getByLabel("Nome fantasia",{exact:false}).fill(name);
  await page.getByLabel("E-mail de contato",{exact:false}).fill("contato@example.test");
  await page.getByLabel("Cidade",{exact:true}).fill("São Paulo");
  await page.getByRole("button",{name:"Salvar alterações"}).click();
  await expect(page).toHaveURL(/\/empresa\/configuracoes\?salvo=1$/);
  await expect(page.locator(".active-context")).toContainText(name);
  await expect(page.getByLabel("Cidade",{exact:true})).toHaveValue("São Paulo");
  await page.getByRole("link",{name:"Usuários e convites",exact:true}).focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("heading",{name:"Usuários e convites",exact:true})).toBeVisible();
  const self=page.locator("li.admin-item").filter({hasText:"(você)"});
  await self.getByRole("button",{name:"Desativar",exact:true}).click();
  await expect(self.getByRole("alert")).toContainText("administrador ativo");
  const seller=page.locator("li.admin-item").filter({hasText:"Vendedor"}).first();
  await seller.getByRole("button",{name:"Desativar",exact:true}).click();
  await expect(page).toHaveURL(/\/empresa\/usuarios\?salvo=1$/);
  await expect(page.locator("li.admin-item").filter({hasText:"Vendedor"}).first()).toContainText("Inativo");
  await page.locator("li.admin-item").filter({hasText:"Vendedor"}).first().getByRole("button",{name:"Reativar",exact:true}).click();
  await expect(page.locator("li.admin-item").filter({hasText:"Vendedor"}).first()).toContainText("Ativo");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  sql(`update public.tenants set trade_name='${f.companyA}' where id='${f.tenantA}';`);
});

test("convite existente não altera senha e só ativa após aceite verificado",async({page,browser,request})=>{
  const f=fixtures();await login(page,"adminA");
  const row=await submitInvitation(page,f.actors.orphan.email,"buyer",f.customerA);
  await expect(row).toContainText("Enviado");
  await row.getByRole("button",{name:"Enviar novamente",exact:true}).click();
  await expect(row).toContainText("Tentativas: 2 de 5");
  const link=await invitationLink(request,f.actors.orphan.email);
  const guest=await browser.newContext(),recipient=await guest.newPage();
  try{
    await recipient.goto(link);expect((await recipient.request.get("http://127.0.0.1:3100/api/identity/context")).status()).toBe(401);
    await recipient.getByRole("button",{name:"Revisar convite"}).click();
    await expect(recipient).toHaveURL(/\/convites\/[0-9a-f-]+$/);
    await expect(recipient.getByLabel("Nova senha",{exact:false})).toHaveCount(0);
    await recipient.getByLabel("Seu nome",{exact:false}).fill("Comprador convidado");
    await recipient.getByRole("button",{name:"Aceitar acesso"}).click();await expect(recipient).toHaveURL(/\/cliente\/inicio$/);
    await expect(recipient.locator(".active-context")).toContainText(f.customerA);
    await recipient.getByRole("button",{name:"Sair",exact:true}).click();await expect(recipient).toHaveURL(/\/login$/);
    await login(recipient,"orphan");await expect(recipient).toHaveURL(/\/cliente\/inicio$/);
  }finally{await guest.close();}
  await page.reload();await expect(page.locator("li.admin-item").filter({hasText:f.actors.orphan.email}).first()).toContainText("Aceito");
});

test("conta nova define senha antes do vínculo; token não concede acesso por si",async({page,browser,request})=>{
  await login(page,"adminA");const email=`novo-${randomUUID()}@example.test`;
  const row=await submitInvitation(page,email);await expect(row).toContainText("Enviado");
  const link=await invitationLink(request,email),id=new URL(link).searchParams.get("invitation")!;
  const guest=await browser.newContext(),recipient=await guest.newPage();
  try{
    await recipient.goto(link);await recipient.getByRole("button",{name:"Revisar convite"}).click();
    await expect(recipient).toHaveURL(/\/convites\/[0-9a-f-]+$/);
    const cookies=(await guest.cookies()).filter(c=>/^atacado-session(?:\.\d+)?$/.test(c.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    const session=JSON.parse(Buffer.from(cookies.map(c=>c.value).join("").slice(7),"base64url").toString("utf8"));
    const early=await request.post("http://127.0.0.1:54321/rest/v1/rpc/accept_invitation",{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,Authorization:`Bearer ${session.access_token}`},data:{p_invitation_id:id,p_display_name:"Pessoa",p_idempotency_key:randomUUID()}});
    expect(early.status()).toBe(400);expect((await early.json()).message).toBe("ACCESS_DENIED");
    const password=randomBytes(24).toString("base64url");
    await recipient.getByLabel("Seu nome",{exact:false}).fill("Nova pessoa");
    await recipient.getByLabel(/^Nova senha/).fill(password);await recipient.getByLabel("Repita a nova senha",{exact:false}).fill(password);
    await recipient.getByRole("button",{name:"Aceitar acesso"}).click();await expect(recipient).toHaveURL(/\/empresa\/inicio$/);
    await expect(recipient.locator(".active-context")).toContainText("Vendedor");
    await recipient.getByRole("button",{name:"Sair",exact:true}).click();await expect(recipient).toHaveURL(/\/login$/);
    await recipient.getByLabel("E-mail",{exact:true}).fill(email);await recipient.getByLabel("Senha",{exact:true}).fill(password);
    await recipient.getByRole("button",{name:"Entrar",exact:true}).click();await expect(recipient).toHaveURL(/\/empresa\/inicio$/);
  }finally{await guest.close();}
});

test("falha real de SMTP fica persistida e pode ser retomada sem duplicar aprovação",async({page,request})=>{
  await login(page,"adminA");const email=`retry-${randomUUID()}@example.test`;
  execFileSync("docker",["stop","supabase_inbucket_meuatacado-local"],{stdio:"pipe"});
  try{
    const row=await submitInvitation(page,email);await expect(row).toContainText("Falha no envio");await expect(row).toContainText("Tentativas: 1 de 5");
  }finally{execFileSync("docker",["start","supabase_inbucket_meuatacado-local"],{stdio:"pipe"});}
  await expect.poll(async()=>{try{return(await request.get("http://127.0.0.1:54324/api/v1/info")).ok();}catch{return false;}},{timeout:10000}).toBe(true);
  const row=page.locator("li.admin-item").filter({hasText:email});await row.getByRole("button",{name:"Tentar envio novamente"}).click();
  await expect(page).toHaveURL(/\/empresa\/usuarios\?convite=1$/);await expect(row).toContainText("Enviado");await expect(row).toContainText("Tentativas: 2 de 5");
  await invitationLink(request,email);
  await row.getByRole("button",{name:"Cancelar convite"}).click();await expect(page).toHaveURL(/\/empresa\/usuarios\?cancelado=1$/);await expect(row).toContainText("Cancelado");
});

test("RLS, concorrência, repetição, revogação, cancelamento e limites persistentes",async({page},info)=>{
  const f=fixtures(),recipient=info.project.name==="admin-360"?"recovery360":"recovery1440",customer=sql(`select id from public.customers where tenant_id='${f.tenantA}' order by id limit 1;`),foreign=sql(`select id from public.customers where tenant_id='${f.tenantB}' order by id limit 1;`);
  const key=randomUUID(),payload={p_membership_id:f.memberAdminA,p_email:f.actors[recipient].email,p_role:"seller",p_customer_id:null,p_idempotency_key:key};
  const parallel=await Promise.all([rpc("adminA","request_invitation",payload),rpc("adminA","request_invitation",payload)]);
  expect(parallel.map(r=>r.status)).toEqual([200,200]);expect(parallel[0]!.data).toEqual(parallel[1]!.data);
  const id=parallel[0]!.data.invitation_id;
  expect(sql(`select count(*) from public.audit_events where request_id='${key}' and action='invitation.requested';`)).toBe("1");
  expect((await rpc("adminA","request_invitation",{...payload,p_role:"admin"})).data.message).toBe("IDEMPOTENCY_CONFLICT");
  expect((await rpc("adminA","request_invitation",{...payload,p_idempotency_key:randomUUID(),p_role:"buyer",p_customer_id:foreign})).data.message).toBe("ACCESS_DENIED");
  for(const [actor,mid]of[["seller",f.memberSeller],["buyer",f.memberBuyer],["adminB",f.memberAdminB]]as const){
    expect((await rpc(actor,"request_invitation",{...payload,p_membership_id:f.memberAdminA})).data.message).toBe("ACCESS_DENIED");
    if(actor!=="adminB")expect((await rpc(actor,"get_tenant_access",{p_membership_id:mid})).data.message).toBe("ACCESS_DENIED");
  }
  const attemptA=randomUUID(),attemptB=randomUUID();
  const claims=await Promise.all([rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:id,p_attempt_id:attemptA}),rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:id,p_attempt_id:attemptB})]);
  for(const claim of claims)if(claim.status!==200)throw new Error(`Claim local recusado: ${claim.data.message}`);
  expect(claims.filter(r=>r.data.claimed).length).toBe(1);
  const won=claims[0]!.data.claimed?attemptA:attemptB;
  expect((await rpc("adminA","finish_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:id,p_attempt_id:won,p_sent:true})).status).toBe(200);
  expect((await rpc("adminB","accept_invitation",{p_invitation_id:id,p_display_name:"Ataque",p_idempotency_key:randomUUID()})).data.message).toBe("ACCESS_DENIED");
  const accept={p_invitation_id:id,p_display_name:"Pessoa convidada",p_idempotency_key:randomUUID()};
  sql(`update public.invitations set expires_at=now()-interval '1 second' where id='${id}';`);
  try{expect((await rpc(recipient,"accept_invitation",accept)).data.message).toBe("ACCESS_DENIED");}
  finally{sql(`update public.invitations set expires_at=now()+interval '7 days' where id='${id}';`);}
  sql(`update public.profiles set status='inactive' where user_id='${f.actors[recipient].id}';`);
  try{
    expect((await rpc(recipient,"get_my_invitation",{p_invitation_id:id})).data.message).toBe("ACCESS_DENIED");
    expect((await rpc(recipient,"accept_invitation",accept)).data.message).toBe("ACCESS_DENIED");
  }
  finally{sql(`update public.profiles set status='active' where user_id='${f.actors[recipient].id}';`);}
  sql(`create function private.test_reject_invitation_audit() returns trigger language plpgsql as $$begin raise exception 'TEST_AUDIT_FAILURE'; end$$;
    create trigger test_reject_invitation_audit before insert on public.audit_events for each row when(new.action='invitation.accepted' and new.entity_id='${id}'::uuid) execute function private.test_reject_invitation_audit();`);
  try{
    expect((await rpc(recipient,"accept_invitation",accept)).data.message).toBe("TEST_AUDIT_FAILURE");
    expect(sql(`select count(*) from public.memberships where tenant_id='${f.tenantA}' and user_id='${f.actors[recipient].id}' and role='seller';`)).toBe("0");
    expect(sql(`select state from public.invitations where id='${id}';`)).toBe("sent");
    expect(sql(`select count(*) from public.idempotency_keys where key='${accept.p_idempotency_key}';`)).toBe("0");
  }finally{sql("drop trigger test_reject_invitation_audit on public.audit_events; drop function private.test_reject_invitation_audit();");}
  const accepted=await Promise.all([rpc(recipient,"accept_invitation",accept),rpc(recipient,"accept_invitation",accept)]);
  expect(accepted.map(r=>r.status)).toEqual([200,200]);expect(accepted[0]!.data).toEqual(accepted[1]!.data);
  expect((await rpc(recipient,"accept_invitation",{...accept,p_display_name:"Outro nome"})).data.message).toBe("IDEMPOTENCY_CONFLICT");
  expect((await rpc(recipient,"accept_invitation",{...accept,p_idempotency_key:randomUUID()})).data).toEqual(accepted[0]!.data);
  expect(sql(`select count(*) from public.memberships where tenant_id='${f.tenantA}' and user_id='${f.actors[recipient].id}' and role='seller';`)).toBe("1");
  expect(sql(`select count(*) from public.audit_events where entity_id='${id}' and action='invitation.accepted';`)).toBe("1");
  const member=accepted[0]!.data.membership_id;
  await rpc("adminA","set_membership_status",{p_membership_id:f.memberAdminA,p_target_membership_id:member,p_status:"inactive",p_idempotency_key:randomUUID()});
  expect((await rpc(recipient,"accept_invitation",accept)).data.message).toBe("ACCESS_DENIED");
  await rpc("adminA","set_membership_status",{p_membership_id:f.memberAdminA,p_target_membership_id:member,p_status:"active",p_idempotency_key:randomUUID()});
  const pending=(await rpc("adminA","request_invitation",{...payload,p_role:"admin",p_idempotency_key:randomUUID()})).data.invitation_id;
  const pendingAttempt=randomUUID();await rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:pending,p_attempt_id:pendingAttempt});
  sql(`update public.invitations set lease_until=now()-interval '1 second' where id='${pending}';`);
  const fresh=randomUUID();expect((await rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:pending,p_attempt_id:fresh})).data.claimed).toBe(true);
  expect((await rpc("adminA","finish_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:pending,p_attempt_id:pendingAttempt,p_sent:true})).data.message).toBe("INVALID_STATE");
  await rpc("adminA","finish_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:pending,p_attempt_id:fresh,p_sent:true});
  // A stale JWT email cannot accept an approval after the Auth identity changes.
  sql(`update auth.users set email='changed-${randomUUID()}@example.test' where id='${f.actors[recipient].id}';`);
  try{expect((await rpc(recipient,"accept_invitation",{...accept,p_invitation_id:pending,p_idempotency_key:randomUUID()})).data.message).toBe("ACCESS_DENIED");}
  finally{sql(`update auth.users set email='${f.actors[recipient].email}' where id='${f.actors[recipient].id}';`);}
  sql(`update public.memberships set status='inactive' where id='${f.memberAdminA}';`);
  try{expect((await rpc(recipient,"accept_invitation",{...accept,p_invitation_id:pending,p_idempotency_key:randomUUID()})).data.message).toBe("ACCESS_DENIED");}
  finally{sql(`update public.memberships set status='active' where id='${f.memberAdminA}';`);}
  await rpc("adminA","cancel_invitation",{p_membership_id:f.memberAdminA,p_invitation_id:pending,p_idempotency_key:randomUUID()});
  expect((await rpc(recipient,"accept_invitation",{...accept,p_invitation_id:pending,p_idempotency_key:randomUUID()})).data.message).toBe("ACCESS_DENIED");
  await login(page,"seller");await page.goto("/empresa/usuarios");await expect(page).toHaveURL(/\/acesso-negado$/);
  expect((await rpc("buyer","request_invitation",{...payload,p_role:"buyer",p_customer_id:customer,p_membership_id:f.memberBuyer})).data.message).toBe("ACCESS_DENIED");
  if(info.project.name==="admin-1440"){
    const limited=(await rpc("adminA","request_invitation",{...payload,p_role:"admin",p_idempotency_key:randomUUID()})).data.invitation_id;
    sql(`update public.invitations set attempt_count=5,state='failed' where id='${limited}';`);
    expect((await rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:limited,p_attempt_id:randomUUID()})).data.message).toBe("RATE_LIMITED");
    const hourLimited=(await rpc("adminA","request_invitation",{...payload,p_role:"buyer",p_customer_id:customer,p_idempotency_key:randomUUID()})).data.invitation_id;
    sql(`insert into public.audit_events(tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id) select '${f.tenantA}','${f.actors.adminA.id}','${f.memberAdminA}','user','invitation.delivery_started','invitation','${limited}',gen_random_uuid() from generate_series(1,30);`);
    expect((await rpc("adminA","claim_invitation_delivery",{p_membership_id:f.memberAdminA,p_invitation_id:hourLimited,p_attempt_id:randomUUID()})).data.message).toBe("RATE_LIMITED");
  }
});
