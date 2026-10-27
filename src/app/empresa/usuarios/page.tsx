import { randomUUID } from "node:crypto";
import { AccessShell } from "@/components/identity/access-shell";
import { AdminForm,InvitationEditor } from "@/components/identity/admin-forms";
import { pageContext } from "@/modules/identity/session";
import { tenantAccess } from "@/modules/identity/administration";
import { roleLabels } from "@/modules/identity/contracts";
import { changeMemberStatus,retryInvitation,cancelInvitation } from "@/modules/identity/admin-actions";
import { invitationDeliveryConfigured } from "@/lib/supabase/invitation-provider";

export const dynamic="force-dynamic";
export default async function UsersPage({searchParams}:{searchParams:Promise<{pagina?:string;salvo?:string;convite?:string;cancelado?:string}>}) {
  await pageContext("admin");
  const params=await searchParams, parsed=Number(params.pagina??"0"), page=Number.isInteger(parsed)&&parsed>=0&&parsed<=10000?parsed:0;
  const {context,data}=await tenantAccess(page), delivery=invitationDeliveryConfigured();
  const states:Record<string,string>={pending:"Aguardando envio",sent:"Enviado",failed:"Falha no envio",accepted:"Aceito",cancelled:"Cancelado"};
  return <AccessShell context={context}><p className="eyebrow">Administração</p><h1>Usuários e convites</h1>
    {params.salvo==="1"&&<p className="notice" role="status">Vínculo atualizado.</p>}
    {params.convite==="1"&&<p className="notice" role="status">Solicitação processada. Confira o estado do convite abaixo.</p>}
    {params.cancelado==="1"&&<p className="notice" role="status">Convite cancelado.</p>}
    <section aria-labelledby="members-title"><h2 id="members-title">Pessoas com acesso</h2>
      {!data.members.length?<p>Nenhum vínculo nesta página.</p>:<ul className="admin-list">{data.members.map(member=><li key={member.id} className="admin-item">
        <div><strong>{member.display_name}{member.is_self?" (você)":""}</strong><p>{roleLabels[member.role]}{member.customer_name?` · ${member.customer_name}`:""}</p><span className="status">{member.status==="active"?"Ativo":"Inativo"}</span></div>
        <AdminForm action={changeMemberStatus} label={member.status==="active"?"Desativar":"Reativar"}>
          <input type="hidden" name="target" value={member.id}/><input type="hidden" name="status" value={member.status==="active"?"inactive":"active"}/><input type="hidden" name="key" value={randomUUID()}/>
        </AdminForm>
      </li>)}</ul>}
      <p className="hint">A desativação preserva o histórico. É necessário manter um administrador ativo.</p>
    </section>
    <section aria-labelledby="invite-title"><h2 id="invite-title">Convidar pessoa</h2>
      {delivery?<InvitationEditor customers={data.customers} requestKey={randomUUID()}/>:<p role="status" className="notice">O envio de convites está indisponível neste ambiente. A configuração de envio precisa ser concluída.</p>}
    </section>
    <section aria-labelledby="invitations-title"><h2 id="invitations-title">Convites</h2>
      {!data.invitations.length?<p>Nenhum convite nesta página.</p>:<ul className="admin-list">{data.invitations.map(invitation=>{
        const open=["pending","sent","failed"].includes(invitation.state), lease=invitation.lease_until&&new Date(invitation.lease_until).getTime()>Date.now();
        const expired=new Date(invitation.expires_at).getTime()<=Date.now();
        return <li className="admin-item" key={invitation.id}><div><strong>{invitation.email}</strong><p>{roleLabels[invitation.role]}{invitation.customer_name?` · ${invitation.customer_name}`:""}</p>
          <span className="status">{open&&expired?"Expirado":lease?"Envio em andamento":states[invitation.state]}</span>
          <p className="hint">Tentativas: {invitation.attempt_count} de 5</p>
          {invitation.state==="failed"&&<p className="hint">O envio falhou. Você pode tentar novamente.</p>}
          {invitation.state==="pending"&&!lease&&invitation.attempt_count>0&&<p className="hint">O envio anterior ficou sem confirmação. Uma nova tentativa pode enviar outro e-mail.</p>}
        </div><div className="admin-item-actions">
          {delivery&&!expired&&!lease&&["pending","failed","sent"].includes(invitation.state)&&invitation.attempt_count<5&&<AdminForm action={retryInvitation} label={invitation.state==="sent"?"Enviar novamente":"Tentar envio novamente"}><input name="invitation" type="hidden" value={invitation.id}/></AdminForm>}
          {open&&<AdminForm action={cancelInvitation} label="Cancelar convite"><input name="invitation" type="hidden" value={invitation.id}/><input name="key" type="hidden" value={randomUUID()}/></AdminForm>}
        </div></li>;
      })}</ul>}
    </section>
    <nav aria-label="Paginação de acessos" className="pagination">
      {page>0&&<a href={`?pagina=${page-1}`}>Página anterior</a>}
      <span>Página {page+1}</span>
      {Math.max(data.member_count,data.invitation_count)>(page+1)*25&&<a href={`?pagina=${page+1}`}>Próxima página</a>}
      <a href="/empresa/usuarios">Atualizar lista</a>
    </nav>
  </AccessShell>;
}
