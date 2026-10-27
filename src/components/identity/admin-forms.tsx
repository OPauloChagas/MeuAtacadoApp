"use client";
import { useActionState,useEffect,useState } from "react";
import type { AdminAction,CompanyData,MyInvitation } from "@/modules/identity/admin-contracts";
import { saveCompany,inviteUser,acceptInvitation } from "@/modules/identity/admin-actions";

export function AdminForm({action,label,children}:{action:AdminAction;label:string;children:React.ReactNode}) {
  const [state,submit,pending]=useActionState(action,{status:"idle",message:""});
  useEffect(()=>{if(state.destination) window.location.assign(state.destination);},[state.destination]);
  const busy=pending||Boolean(state.destination);
  return <form action={submit} className="stack" aria-busy={busy}>{children}
    {state.message&&<p className="notice notice-error" role="alert">{state.message}</p>}
    <button className="button" disabled={busy}>{busy?"Aguarde…":label}</button>
  </form>;
}
export function CompanyEditor({company,requestKey}:{company:CompanyData;requestKey:string}) {
  const [values,setValues]=useState<Record<string,string>>({legal_name:company.legalName,trade_name:company.tradeName,
    email:company.contact.email??"",phone:company.contact.phone??"",...Object.fromEntries(["street","number","district","city","state","postal_code"].map(k=>[k,company.address[k]??""]))});
  const fields=[
    {name:"legal_name",label:"Razão social",max:200,required:true}, {name:"trade_name",label:"Nome fantasia",max:160,required:true},
    {name:"email",label:"E-mail de contato",type:"email",max:254}, {name:"phone",label:"Telefone",type:"tel",max:30},
    {name:"street",label:"Rua / logradouro",max:160},{name:"number",label:"Número",max:160},
    {name:"district",label:"Bairro",max:160},{name:"city",label:"Cidade",max:160},{name:"state",label:"UF",max:2},{name:"postal_code",label:"CEP",max:160},
  ];
  return <AdminForm action={saveCompany} label="Salvar alterações">
    <input type="hidden" name="key" value={requestKey}/><input type="hidden" name="revision" value={company.revision}/>
    <div className="form-grid">{fields.map(field=><div className="field" key={field.name}>
      <label htmlFor={field.name}>{field.label}{field.required?" *":""}</label>
      <input id={field.name} name={field.name} type={field.type??"text"} required={field.required??false} maxLength={field.max}
        value={values[field.name]??""} onChange={e=>setValues({...values,[field.name]:e.target.value})}/>
    </div>)}</div>
    <p className="hint">* Campos obrigatórios. O documento da empresa é preservado.</p>
  </AdminForm>;
}
export function InvitationEditor({customers,requestKey}:{customers:{id:string;name:string}[];requestKey:string}) {
  const [email,setEmail]=useState(""),[role,setRole]=useState("seller"),[customer,setCustomer]=useState("");
  return <AdminForm action={inviteUser} label="Enviar convite">
    <input type="hidden" name="key" value={requestKey}/>
    <div className="field"><label htmlFor="invite-email">E-mail do convidado *</label><input id="invite-email" name="email" type="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div className="field"><label htmlFor="invite-role">Função *</label><select id="invite-role" name="role" value={role} onChange={e=>setRole(e.target.value)}><option value="seller">Vendedor</option><option value="admin">Administrador</option><option value="buyer">Comprador</option></select></div>
    {role==="buyer"?<div className="field"><label htmlFor="invite-customer">Cliente representado *</label><select id="invite-customer" name="customer_id" required value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Selecione um cliente</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {!customers.length&&<p className="hint">Não há clientes ativos disponíveis para vincular um comprador.</p>}</div>:<input name="customer_id" type="hidden" value=""/>}
    <p className="hint">O acesso só será liberado após a confirmação do destinatário. A senha nunca é exibida ao administrador.</p>
  </AdminForm>;
}
export function InvitationAcceptance({invitation,requestKey}:{invitation:MyInvitation;requestKey:string}) {
  const [name,setName]=useState(invitation.email.split("@")[0]!.slice(0,120));
  return <AdminForm action={acceptInvitation} label="Aceitar acesso">
    <input type="hidden" name="invitation" value={invitation.id}/><input type="hidden" name="key" value={requestKey}/>
    <div className="field"><label htmlFor="display_name">Seu nome *</label><input id="display_name" name="display_name" maxLength={120} required value={name} onChange={e=>setName(e.target.value)}/></div>
    {invitation.requires_password&&<>
      <p id="invite-password-help" className="hint">Defina sua senha com 12 a 128 caracteres para concluir o acesso.</p>
      <div className="field"><label htmlFor="invite-password">Nova senha *</label><input id="invite-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="invite-password-help"/></div>
      <div className="field"><label htmlFor="invite-confirmation">Repita a nova senha *</label><input id="invite-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></div>
    </>}
  </AdminForm>;
}
