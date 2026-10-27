import { AuthShell } from "@/components/identity/auth-shell";
export default function DeniedPage() {
  return <AuthShell title="Acesso não permitido"><p>Seu vínculo atual não permite acessar esta página.</p><a href="/selecionar-acesso" className="secondary-link">Escolher outro acesso</a></AuthShell>;
}
