import { AssignmentsPage,type RawQuery } from "@/components/commercial/pages";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: RawQuery }) { return <AssignmentsPage searchParams={searchParams} />; }
