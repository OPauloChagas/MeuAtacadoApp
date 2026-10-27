import type { NextRequest } from "next/server";
import { privateJson } from "@/modules/identity/http";
import { query,CommercialProblem } from "@/modules/commercial/contracts";
import { options,resources,type Resource } from "@/modules/commercial/service";
import { commercialError } from "@/modules/commercial/http";
export async function GET(request: NextRequest) {
 try { const p = request.nextUrl.searchParams,r = p.get("resource"); if (!resources.includes(r as Resource)) throw new CommercialProblem("VALIDATION_ERROR"); return privateJson({ data: await options(r as Resource,query(p)) }); }
 catch (e) { return commercialError(e); }
}
