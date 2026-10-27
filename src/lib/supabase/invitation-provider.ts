import "server-only";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { readIdentityConfig } from "./config";

function deliveryConfig() {
  const config=readIdentityConfig();
  const secret=process.env.SUPABASE_SECRET_KEY;
  const host=process.env.SMTP_HOST, port=Number(process.env.SMTP_PORT), sender=process.env.SMTP_FROM;
  if (!secret || (!secret.startsWith("sb_secret_") && !secret.startsWith("eyJ")) || !host || !Number.isInteger(port) || port<1 || port>65535 || !sender || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender)) throw new Error("DELIVERY_UNAVAILABLE");
  const local=["localhost","127.0.0.1","[::1]"].includes(host);
  if (local && !["localhost","127.0.0.1","[::1]"].includes(new URL(config.url).hostname)) throw new Error("DELIVERY_UNAVAILABLE");
  return { ...config,secret,host,port,sender,local };
}
export function invitationDeliveryConfigured() { try { deliveryConfig(); return true; } catch { return false; } }

/** Called only after an actor-scoped claim RPC. Elevated key never queries DB. */
export async function sendInvitation(email:string,id:string,attempt:string):Promise<"AUTH_PROVIDER_UNAVAILABLE"|"EMAIL_PROVIDER_UNAVAILABLE"|null> {
  let config:ReturnType<typeof deliveryConfig>;
  try { config=deliveryConfig(); } catch { return "AUTH_PROVIDER_UNAVAILABLE"; }
  let hash:string, type:"invite"|"magiclink"="invite";
  try {
    const admin=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(15_000)})}}).auth.admin;
    let response=await admin.generateLink({type:"invite",email});
    if (response.error && ["email_exists","user_already_exists"].includes(response.error.code??"")) {
      type="magiclink";
      response=await admin.generateLink({type:"magiclink",email});
    }
    if (response.error || !response.data.properties?.hashed_token) return "AUTH_PROVIDER_UNAVAILABLE";
    hash=response.data.properties.hashed_token;
  } catch { return "AUTH_PROVIDER_UNAVAILABLE"; }
  const url=new URL("/auth/invite",config.origin);
  url.searchParams.set("token_hash",hash); url.searchParams.set("type",type); url.searchParams.set("invitation",id);
  try {
    const transport=nodemailer.createTransport({host:config.host,port:config.port,secure:config.port===465,
      requireTLS:!config.local,connectionTimeout:8000,socketTimeout:10000,
      ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}}:{}),
      disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
    const result=await transport.sendMail({from:{address:config.sender,name:"Atacado"},to:{address:email,name:""},subject:"Você recebeu um convite no Atacado",
      messageId:`<${attempt}@${new URL(config.origin).hostname}>`,
      text:`Você recebeu um convite para acessar o Atacado.\n\nAbra o link para confirmar sua identidade e revisar o acesso:\n${url.href}\n\nSe não reconhece este convite, ignore esta mensagem.`,
    });
    if (!result.accepted.length) return "EMAIL_PROVIDER_UNAVAILABLE";
    return null;
  } catch { return "EMAIL_PROVIDER_UNAVAILABLE"; }
}
