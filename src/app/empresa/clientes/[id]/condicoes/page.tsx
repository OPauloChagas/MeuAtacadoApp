import { CustomerCommercialPage,type RawQuery } from "@/components/commercial/pages";
export const dynamic = "force-dynamic";
export default async function Page({ params,searchParams }: { params: Promise<{ id: string }>; searchParams: RawQuery }) { return <CustomerCommercialPage customerId={(await params).id} searchParams={searchParams} />; }
