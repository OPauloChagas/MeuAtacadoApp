import { redirect } from "next/navigation";
import { AuthShell } from "@/components/identity/auth-shell";
import { AuthForm } from "@/components/identity/auth-form";
import { changePassword } from "@/modules/identity/actions";
import { authenticatedClient } from "@/modules/identity/session";

export const dynamic = "force-dynamic";
export default async function PasswordPage() {
  try { await authenticatedClient(); } catch { redirect("/recuperar-senha"); }
  return <AuthShell title="Definir nova senha"><AuthForm action={changePassword} kind="password" /></AuthShell>;
}
