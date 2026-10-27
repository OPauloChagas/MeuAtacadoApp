"use server";
import { companyInput,invitationInput,uuidField,textField,safeAdminMessage,type AdminState } from "./admin-contracts";
import { adminSelection,runRpc,deliverInvitation,myInvitation } from "./administration";
import { createAuthClient } from "@/lib/supabase/server";
import { readRecoveryHash,readPassword,dashboardPath } from "./contracts";
import { AccessFailure,clearContext,writeContext,validateContext } from "./session";

function failure(error:unknown):AdminState {
  return {status:"error",message:safeAdminMessage(error instanceof AccessFailure?"ACCESS_DENIED":error instanceof Error?error.message:"")};
}
export async function saveCompany(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const {client,context}=await adminSelection(), input=companyInput(form);
    await runRpc(client,"update_tenant",{p_membership_id:context.membership_id,p_expected_revision:input.revision,p_legal_name:input.legalName,p_trade_name:input.tradeName,p_contact:input.contact,p_address:input.address,p_idempotency_key:input.key});
    return {status:"success",message:"",destination:"/empresa/configuracoes?salvo=1"};
  } catch(error){return failure(error);}
}
export async function changeMemberStatus(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const {client,context}=await adminSelection(), target=uuidField(form,"target"), status=form.get("status");
    if(status!=="active"&&status!=="inactive") throw new Error("VALIDATION_ERROR");
    await runRpc(client,"set_membership_status",{p_membership_id:context.membership_id,p_target_membership_id:target,p_status:status,p_idempotency_key:uuidField(form,"key")});
    return {status:"success",message:"",destination:target===context.membership_id&&status==="inactive"?"/selecionar-acesso":"/empresa/usuarios?salvo=1"};
  } catch(error){return failure(error);}
}
export async function inviteUser(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const {client,context}=await adminSelection(), input=invitationInput(form);
    const result=await runRpc(client,"request_invitation",{p_membership_id:context.membership_id,p_email:input.email,p_role:input.role,p_customer_id:input.customerId,p_idempotency_key:input.key}) as {invitation_id:string};
    await deliverInvitation(client,context.membership_id,result.invitation_id);
    return {status:"success",message:"",destination:"/empresa/usuarios?convite=1"};
  } catch(error){return failure(error);}
}
export async function retryInvitation(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const {client,context}=await adminSelection();
    await deliverInvitation(client,context.membership_id,uuidField(form,"invitation"),true);
    return {status:"success",message:"",destination:"/empresa/usuarios?convite=1"};
  } catch(error){return failure(error);}
}
export async function cancelInvitation(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const {client,context}=await adminSelection();
    await runRpc(client,"cancel_invitation",{p_membership_id:context.membership_id,p_invitation_id:uuidField(form,"invitation"),p_idempotency_key:uuidField(form,"key")});
    return {status:"success",message:"",destination:"/empresa/usuarios?cancelado=1"};
  } catch(error){return failure(error);}
}
export async function confirmInvitation(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const token=readRecoveryHash(form.get("token_hash")), type=form.get("type"), id=uuidField(form,"invitation");
    if(!token||(type!=="invite"&&type!=="magiclink")) throw new Error("INVALID_STATE");
    const client=await createAuthClient(true);
    const {error}=await client.auth.verifyOtp({token_hash:token,type});
    if(error) throw new Error("INVALID_STATE");
    await clearContext();
    return {status:"success",message:"",destination:`/convites/${id}`};
  } catch {return {status:"error",message:"Este link é inválido ou expirou. Solicite um novo convite ao fornecedor."};}
}
export async function acceptInvitation(_state:AdminState,form:FormData):Promise<AdminState> {
  try {
    const id=uuidField(form,"invitation"), key=uuidField(form,"key"), name=textField(form,"display_name",120,true);
    const {client,invitation}=await myInvitation(id,true);
    if(invitation.requires_password){
      const password=readPassword(form.get("password"),12);
      if(!password||password!==form.get("confirmation")) return {status:"error",message:"Use de 12 a 128 caracteres e repita a mesma senha nos dois campos."};
      const {error}=await client.auth.updateUser({password});
      if(error&&error.code!=="same_password") throw new Error("VALIDATION_ERROR");
      // Auth generates an unusable random credential when inviting a new user.
      // A real password sign-in provides the signed amr proof required by SQL.
      const signedIn=await client.auth.signInWithPassword({email:invitation.email,password});
      if(signedIn.error) throw new Error("VALIDATION_ERROR");
    }
    const result=await runRpc(client,"accept_invitation",{p_invitation_id:id,p_display_name:name,p_idempotency_key:key}) as {membership_id:string};
    const context=await validateContext(client,result.membership_id);
    await writeContext(context.membership_id);
    return {status:"success",message:"",destination:dashboardPath(context.role)};
  } catch(error){return failure(error);}
}
