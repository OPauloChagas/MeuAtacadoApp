import { readEmail, uuidPattern } from "./contracts";

export type AdminState = { message: string; status: "idle" | "error" | "success"; destination?: string };
export type AdminAction = (state: AdminState, data: FormData) => Promise<AdminState>;
export type CompanyData = { legalName: string; tradeName: string; document: string; revision: number; contact: Record<string,string>; address: Record<string,string> };
export type MemberData = { id: string; role: "admin"|"seller"|"buyer"; status: string; display_name: string; customer_name: string|null; is_self: boolean };
export type InvitationData = { id: string; email: string; role: "admin"|"seller"|"buyer"; state: string; attempt_count: number; failure_code: string|null; lease_until: string|null; expires_at: string; customer_name: string|null };
export type TenantAccessData = { members: MemberData[]; invitations: InvitationData[]; customers: { id:string; name:string }[]; member_count:number; invitation_count:number };
export type MyInvitation = { id:string; company_name:string; email:string; role:"admin"|"seller"|"buyer"; customer_name:string|null; state:string; requires_password:boolean };

export function textField(form: FormData, name: string, maximum: number, required = false): string {
  const value = form.get(name);
  if (typeof value !== "string" || value.trim().length>maximum || (required && !value.trim())) throw new Error("VALIDATION_ERROR");
  return value.trim();
}
export function uuidField(form: FormData, name: string): string {
  const value=form.get(name);
  if (typeof value!=="string" || !uuidPattern.test(value)) throw new Error("VALIDATION_ERROR");
  return value;
}
export function companyInput(form: FormData) {
  const legalName=textField(form,"legal_name",200,true), tradeName=textField(form,"trade_name",160,true);
  const revision=Number(form.get("revision"));
  if (!Number.isSafeInteger(revision) || revision<1) throw new Error("VALIDATION_ERROR");
  const email=textField(form,"email",254), phone=textField(form,"phone",30);
  if ((email && !readEmail(email)) || !/^[+\d ()-]*$/.test(phone)) throw new Error("VALIDATION_ERROR");
  const address=Object.fromEntries(["street","number","district","city","state","postal_code"].map((name)=>[name,textField(form,name,name==="state"?2:160)]));
  if (address.state && !/^[A-Za-z]{2}$/.test(address.state)) throw new Error("VALIDATION_ERROR");
  return { legalName,tradeName,revision,contact:{email:email?readEmail(email)!:"",phone},address:{...address,state:address.state?.toUpperCase()??""},key:uuidField(form,"key") };
}
export function invitationInput(form: FormData) {
  const email=readEmail(form.get("email")), role=form.get("role"), customer=form.get("customer_id");
  if (!email || (role!=="admin" && role!=="seller" && role!=="buyer") || typeof customer!=="string") throw new Error("VALIDATION_ERROR");
  if ((role==="buyer" && !uuidPattern.test(customer)) || (role!=="buyer" && customer!=="")) throw new Error("VALIDATION_ERROR");
  return { email,role,customerId:customer||null,key:uuidField(form,"key") };
}
export function safeAdminMessage(code: string): string {
  const messages:Record<string,string>={
    VALIDATION_ERROR:"Confira os campos informados.", STALE_VERSION:"Os dados foram alterados por outra pessoa. Recarregue a página antes de salvar.",
    ACCESS_DENIED:"Seu acesso ou o vínculo informado não está disponível.", LAST_ADMIN:"É necessário manter ao menos um administrador ativo.",
    IDEMPOTENCY_CONFLICT:"Esta solicitação já foi usada com outros dados. Recarregue a página.", RATE_LIMITED:"Limite de envios atingido. Aguarde antes de tentar novamente.",
    INVALID_STATE:"O convite não está disponível para esta operação.",
  };
  return messages[code]??"Não foi possível concluir. Tente novamente mais tarde.";
}
