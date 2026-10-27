import { AuthShell, Unavailable } from "@/components/identity/auth-shell";
import { AuthForm } from "@/components/identity/auth-form";
import { recoverPassword } from "@/modules/identity/actions";
import { identityConfigured, passwordRecoveryConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export default function RecoveryPage() {
  return <AuthShell title="Recuperar acesso">
    {passwordRecoveryConfigured() ? <>
      <p>Informe seu e-mail para receber as instruções de recuperação.</p>
      <AuthForm action={recoverPassword} kind="recover" />
    </> : identityConfigured() ? <p role="status" className="notice">A recuperação de senha está indisponível neste ambiente. Fale com o administrador do fornecedor.</p> : <Unavailable />}
    <a className="secondary-link" href="/login">Voltar para entrar</a>
  </AuthShell>;
}
