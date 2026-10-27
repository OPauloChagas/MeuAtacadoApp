import { TablesPage,type RawQuery } from "@/components/commercial/pages";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: RawQuery }) { return <TablesPage kind="commission" searchParams={searchParams} />; }
