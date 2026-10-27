import { TermsPage,type RawQuery } from "@/components/commercial/pages";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: RawQuery }) { return <TermsPage searchParams={searchParams} />; }
