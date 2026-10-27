import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";

export const dynamic = "force-dynamic";
export default async function CompanyHome() {
  const { context } = await pageContext();
  if (context.role === "buyer") redirect("/cliente/inicio");
  return <AccessShell context={context}>
    <p className="eyebrow">Espaço do fornecedor</p><h1>Seu espaço de trabalho</h1>
    <p className="intro">Você está em {context.company_name} como {context.role === "admin" ? "administrador" : "vendedor"}.</p>
    <section><h2>Acesso confirmado</h2><p>Seu vínculo está ativo. Os módulos comerciais serão disponibilizados nas próximas etapas.</p></section>
  </AccessShell>;
}
