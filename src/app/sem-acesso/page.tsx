import { redirect } from "next/navigation";
import { AuthShell } from "@/components/identity/auth-shell";
import { NativeForm } from "@/components/identity/native-form";
import { authenticatedClient } from "@/modules/identity/session";

export const dynamic = "force-dynamic";
export default async function NoAccessPage() {
  await authenticatedClient().catch(() => redirect("/login"));
  return <AuthShell title="Acesso indisponível">
    <p>Sua conta não possui um vínculo ativo. Entre em contato com o fornecedor para verificar seu acesso.</p>
    <a className="secondary-link" href="/selecionar-acesso">Verificar novamente</a>
    <NativeForm action="/auth/logout"><button className="text-button secondary-link">Sair da conta</button></NativeForm>
  </AuthShell>;
}
