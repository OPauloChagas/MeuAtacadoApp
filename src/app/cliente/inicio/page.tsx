import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";

export const dynamic = "force-dynamic";
export default async function CustomerHome() {
  const { context } = await pageContext();
  if (context.role !== "buyer") redirect("/empresa/inicio");
  return <AccessShell context={context}>
    <p className="eyebrow">Espaço do comprador</p><h1>Bem-vindo ao seu portal</h1>
    <p className="intro">Você representa {context.customer_name} em {context.company_name}.</p>
    <section><h2>Produtos para seu negócio</h2><p>Consulte os preços disponíveis e simule quantidades antes de fazer seu pedido.</p><a className="secondary-link" href="/cliente/catalogo">Abrir catálogo</a><p className="hint">O envio de pedidos será disponibilizado em uma próxima etapa.</p></section>
  </AccessShell>;
}
