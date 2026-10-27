import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AccessShell } from "@/components/identity/access-shell";
import { ProductEditor } from "@/components/products/editor";
import { pageContext } from "@/modules/identity/session";
export const dynamic = "force-dynamic";
export default async function NewProductPage() {
  const { context } = await pageContext("admin");
  return <AccessShell context={context}><p className="eyebrow">Cadastros</p><h1>Novo produto</h1><Link prefetch={false} href="/empresa/produtos">Voltar para a lista</Link><section><h2>Dados do produto</h2><ProductEditor requestKey={randomUUID()} /></section></AccessShell>;
}
