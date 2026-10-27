import type { NextRequest } from "next/server";
import { privateJson } from "@/modules/identity/http";
import { kind,id,query,CommercialProblem } from "@/modules/commercial/contracts";
import { tables,versions,versionDetail,paymentTerms,customerCommercial,assignments } from "@/modules/commercial/service";
import { commercialError } from "@/modules/commercial/http";
export async function GET(request: NextRequest) {
 try { const p = request.nextUrl.searchParams,q = query(p); let data: unknown;
  switch (p.get("scope") ?? "tables") {
   case "tables": data = (await tables(kind(p.get("kind")),q)).data; break;
   case "versions": { const r = await versions(kind(p.get("kind")),id(p.get("id")),q); data = { ...r.data,table: r.table,timezone: r.timezone }; break; }
   case "version": { const r = await versionDetail(kind(p.get("kind")),id(p.get("id")),q); data = { ...r.data,version: r.version,timezone: r.timezone }; break; }
   case "terms": data = (await paymentTerms(q)).data; break;
   case "customer": data = (await customerCommercial(id(p.get("id")))).data; break;
   case "assignments": { const r = await assignments(q); data = { ...r.data,timezone: r.timezone }; break; }
   default: throw new CommercialProblem("VALIDATION_ERROR");
  } return privateJson({ data });
 } catch (e) { return commercialError(e); }
}
