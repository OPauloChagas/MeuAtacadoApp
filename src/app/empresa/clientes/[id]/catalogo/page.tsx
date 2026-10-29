import { redirect } from "next/navigation";
import { pageContext } from "@/modules/identity/session";
import { CatalogPage, type RawQuery } from "@/components/catalog/page";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: RawQuery }) {
  if ((await pageContext()).context.role === "buyer") redirect("/acesso-negado");
  return <CatalogPage customer={(await params).id} searchParams={searchParams} />;
}
