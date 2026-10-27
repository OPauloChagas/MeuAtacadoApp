import { AuthShell } from "@/components/identity/auth-shell";
import { AdminForm } from "@/components/identity/admin-forms";
import { confirmInvitation } from "@/modules/identity/admin-actions";
import { readRecoveryHash,uuidPattern } from "@/modules/identity/contracts";

export const dynamic="force-dynamic";
export default async function InviteConfirmation({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;invitation?:string}>}) {
  const params=await searchParams, hash=readRecoveryHash(params.token_hash), type=params.type, id=params.invitation;
  const valid=hash&&(type==="invite"||type==="magiclink")&&typeof id==="string"&&uuidPattern.test(id);
  return <AuthShell title="Você recebeu um convite">
    {valid?<><p>Confirme sua identidade para revisar o acesso antes de aceitá-lo.</p><AdminForm action={confirmInvitation} label="Revisar convite">
      <input name="token_hash" type="hidden" value={hash}/><input name="type" type="hidden" value={type}/><input name="invitation" type="hidden" value={id}/>
    </AdminForm></>:<p className="notice notice-error" role="alert">Este link é inválido ou expirou. Solicite um novo convite ao fornecedor.</p>}
    <a href="/login" className="secondary-link">Voltar para entrar</a>
  </AuthShell>;
}
