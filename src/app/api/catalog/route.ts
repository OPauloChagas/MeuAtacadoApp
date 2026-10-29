import type { NextRequest } from "next/server";
import { privateJson,verifyOrigin } from "@/modules/identity/http";
import { selectedContext } from "@/modules/identity/session";
import { customerId,query,quoteInput,message,CatalogProblem } from "@/modules/catalog/contracts";
import { listCatalog,quoteCatalog } from "@/modules/catalog/service";
import { catalogError,quoteBody } from "@/modules/catalog/http";
export async function GET(request:NextRequest) {try{const p=request.nextUrl.searchParams;return privateJson({data:(await listCatalog(customerId(p),query(p))).data});}catch(e){return catalogError(e);}}
export async function POST(request:NextRequest) {try{verifyOrigin(request);const session=await selectedContext();if(request.headers.get("X-Atacado-Context")!==session.context.membership_id)throw new CatalogProblem("ACCESS_DENIED");const input=quoteInput(await quoteBody(request));const data=await quoteCatalog(session,input.customer,input.items,input.expectedToken);
 return data.status==="price_changed"?privateJson({data,error:{code:"PRICE_CHANGED",message:message("PRICE_CHANGED"),fields:{}}},409):privateJson({data});
 }catch(e){return catalogError(e);}}
