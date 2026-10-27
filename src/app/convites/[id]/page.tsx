import { randomUUID } from "node:crypto";
import { AuthShell } from "@/components/identity/auth-shell";
import { InvitationAcceptance } from "@/components/identity/admin-forms";
import { myInvitation } from "@/modules/identity/administration";
import { roleLabels,uuidPattern } from "@/modules/identity/contracts";

export const dynamic="force-dynamic";
export default async function InvitationPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const result=uuidPattern.test(id)?await myInvitation(id).catch(()=>null):null;
  if(!result) return <AuthShell title="Convite indisponível"><p>Este convite não está disponível para sua conta. Confirme o e-mail recebido ou entre com o endereço convidado.</p><a className="secondary-link" href="/login">Entrar na conta</a></AuthShell>;
  const {invitation}=result;
  return <AuthShell title="Revise seu novo acesso"><p><strong>{invitation.company_name}</strong> convidou você como {roleLabels[invitation.role].toLowerCase()}{invitation.customer_name?` para ${invitation.customer_name}`:""}.</p>
    <p>Destinatário: {invitation.email}</p><InvitationAcceptance invitation={invitation} requestKey={randomUUID()}/>
  </AuthShell>;
}
