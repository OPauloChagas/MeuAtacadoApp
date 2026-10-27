import { expect,type Page,type APIRequestContext } from "@playwright/test";
import type { Fixtures } from "../auth/setup";
export const fixtures=()=>JSON.parse(process.env.E2E_IDENTITY_FIXTURES??"null") as Fixtures;
export async function login(page:Page,actor:keyof Fixtures["actors"]) {
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures().actors[actor].email);
  await page.getByLabel("Senha",{exact:true}).fill(fixtures().password);await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page).toHaveURL(/\/(empresa\/inicio|cliente\/inicio|sem-acesso|selecionar-acesso)$/);
}
const tokens=new Map<string,string>();
export async function actorToken(actor:keyof Fixtures["actors"]) {
  if(tokens.has(actor))return tokens.get(actor)!;
  const response=await fetch("http://127.0.0.1:54321/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,"Content-Type":"application/json"},body:JSON.stringify({email:fixtures().actors[actor].email,password:fixtures().password})});
  if(!response.ok)throw new Error("Login do ator local falhou.");
  const data=await response.json();tokens.set(actor,data.access_token);return data.access_token as string;
}
export async function rpc(actor:keyof Fixtures["actors"],name:string,body:Record<string,unknown>) {
  const response=await fetch(`http://127.0.0.1:54321/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,Authorization:`Bearer ${await actorToken(actor)}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
}
export async function invitationLink(request:APIRequestContext,email:string) {
  let id="";
  await expect.poll(async()=>{
    const response=await request.get(`http://127.0.0.1:54324/api/v1/search?query=to:${encodeURIComponent(email)}`);
    if(!response.ok())return false;
    id=(await response.json()).messages?.[0]?.ID??"";return Boolean(id);
  },{timeout:15_000,message:"E-mail local deve chegar ao Mailpit"}).toBe(true);
  const message=await(await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`)).json();
  const link=(message.Text as string).match(/https?:\/\/[^\s]+/)?.[0];
  if(!link)throw new Error("Convite sem link local.");
  const url=new URL(link);expect(url.origin).toBe("http://127.0.0.1:3100");expect(url.pathname).toBe("/auth/invite");
  return url.href;
}
export async function submitInvitation(page:Page,email:string,role="seller",customerName?:string) {
  await page.goto("/empresa/usuarios");await page.getByLabel("E-mail do convidado",{exact:false}).fill(email);
  await page.getByLabel("Função",{exact:false}).selectOption(role);
  if(customerName)await page.getByLabel("Cliente representado",{exact:false}).selectOption({label:customerName});
  await page.getByRole("button",{name:"Enviar convite",exact:true}).click();
  await expect(page).toHaveURL(/\/empresa\/usuarios\?convite=1$/);
  return page.locator("li.admin-item").filter({has:page.getByText(email,{exact:true})}).first();
}
