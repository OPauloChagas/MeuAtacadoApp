import { AuthShell } from "@/components/identity/auth-shell";
import { AuthForm } from "@/components/identity/auth-form";
import { confirmRecovery } from "@/modules/identity/actions";
import { readRecoveryHash } from "@/modules/identity/contracts";

export const dynamic = "force-dynamic";
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const params = await searchParams;
  const hash = params.type === "recovery" ? readRecoveryHash(params.token_hash) : null;
  return <AuthShell title="Confirme a recuperação">
    {hash ? <><p>Continue para definir sua nova senha. Este link pode ser utilizado uma única vez.</p><AuthForm action={confirmRecovery} kind="confirm" tokenHash={hash} /></> : <p role="alert" className="notice notice-error">Este link é inválido ou expirou.</p>}
    <a className="secondary-link" href="/recuperar-senha">Solicitar nova recuperação</a>
  </AuthShell>;
}
