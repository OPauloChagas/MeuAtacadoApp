import { AuthShell, Unavailable } from "@/components/identity/auth-shell";
import { AuthForm } from "@/components/identity/auth-form";
import { recoverPassword } from "@/modules/identity/actions";
import { identityConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export default function RecoveryPage() {
  return <AuthShell title="Recuperar acesso">
    <p>Informe seu e-mail para receber as instruções de recuperação.</p>
    {identityConfigured() ? <AuthForm action={recoverPassword} kind="recover" /> : <Unavailable />}
    <a className="secondary-link" href="/login">Voltar para entrar</a>
  </AuthShell>;
}
