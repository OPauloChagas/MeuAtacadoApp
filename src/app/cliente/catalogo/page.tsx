import { redirect } from "next/navigation";
import { pageContext } from "@/modules/identity/session";
import { CatalogPage, type RawQuery } from "@/components/catalog/page";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: RawQuery }) {
  if ((await pageContext()).context.role !== "buyer") redirect("/empresa/clientes");
  return <CatalogPage customer={null} searchParams={searchParams} />;
}
