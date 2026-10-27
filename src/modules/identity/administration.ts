import "server-only";
import { randomUUID } from "node:crypto";
import { selectedContext, AccessFailure, authenticatedClient } from "./session";
import { sendInvitation } from "@/lib/supabase/invitation-provider";
import type { TenantAccessData, MyInvitation } from "./admin-contracts";
import type { createAuthClient } from "@/lib/supabase/server";

type Client=Awaited<ReturnType<typeof createAuthClient>>;
export async function runRpc(client:Client,name:string,args:Record<string,unknown>):Promise<unknown> {
  const {data,error}=await client.rpc(name,args);
  if (error) throw new Error(error.message);
  return data;
}
export async function adminSelection() {
  const current=await selectedContext();
  if(current.context.role!=="admin") throw new AccessFailure(403);
  return current;
}
export async function tenantAccess(page=0) {
  const {client,context}=await adminSelection();
  const data=await runRpc(client,"get_tenant_access",{p_membership_id:context.membership_id,p_page:page});
  if(!data || typeof data!=="object") throw new AccessFailure(503);
  const v=data as TenantAccessData;
  if(!Array.isArray(v.members)||!Array.isArray(v.invitations)||!Array.isArray(v.customers)||typeof v.member_count!=="number"||typeof v.invitation_count!=="number") throw new AccessFailure(503);
  return {context,data:{members:v.members,invitations:v.invitations,customers:v.customers,member_count:v.member_count,invitation_count:v.invitation_count}};
}
export async function deliverInvitation(client:Client,membershipId:string,id:string,retry=false) {
  const attempt=randomUUID();
  const claim=await runRpc(client,"claim_invitation_delivery",{p_membership_id:membershipId,p_invitation_id:id,p_attempt_id:attempt,p_retry:retry});
  if(!claim||typeof claim!=="object") throw new Error("UNAVAILABLE");
  const delivery=claim as {claimed:boolean;email?:string};
  if(!delivery.claimed) return;
  if(typeof delivery.email!=="string") throw new Error("UNAVAILABLE");
  const failure=await sendInvitation(delivery.email,id,attempt);
  await runRpc(client,"finish_invitation_delivery",{p_membership_id:membershipId,p_invitation_id:id,p_attempt_id:attempt,p_sent:failure===null,p_failure_code:failure});
}
export async function myInvitation(id:string,writable=false) {
  const client=await authenticatedClient(writable);
  const data=await runRpc(client,"get_my_invitation",{p_invitation_id:id});
  if(!data||typeof data!=="object") throw new AccessFailure(403);
  const v=data as MyInvitation;
  if(v.id!==id||typeof v.company_name!=="string"||typeof v.email!=="string"||typeof v.requires_password!=="boolean"||!["admin","seller","buyer"].includes(v.role)) throw new AccessFailure(503);
  return {client,invitation:{id:v.id,company_name:v.company_name,email:v.email,role:v.role,customer_name:v.customer_name,state:v.state,requires_password:v.requires_password}};
}
