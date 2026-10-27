import { AuthShell, Unavailable } from "@/components/identity/auth-shell";
import { AuthForm } from "@/components/identity/auth-form";
import { login } from "@/modules/identity/actions";
import { identityConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Bem-vindo de volta">
    <p>Entre com o e-mail vinculado ao seu fornecedor.</p>
    {params.senha === "atualizada" && <p role="status" className="notice">Senha atualizada. Entre com sua nova senha.</p>}
    {identityConfigured() ? <AuthForm action={login} kind="login" /> : <Unavailable />}
    <a className="secondary-link" href="/recuperar-senha">Esqueci minha senha</a>
  </AuthShell>;
}
