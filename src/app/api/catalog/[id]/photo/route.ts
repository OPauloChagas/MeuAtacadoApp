import type { NextRequest } from "next/server";
import { selectedContext } from "@/modules/identity/session";
import { customerId,id,CatalogProblem } from "@/modules/catalog/contracts";
import { photoReference } from "@/modules/catalog/service";
import { catalogError } from "@/modules/catalog/http";
import { normalizePhoto } from "@/modules/products/images";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {try{const session=await selectedContext(),product=id((await params).id),customer=customerId(request.nextUrl.searchParams),path=await photoReference(session,customer,product);
 const {data,error}=await session.client.storage.from("product-photos").download(path);if(error||!data)throw new CatalogProblem("PHOTO_UNAVAILABLE");
 const bytes=await normalizePhoto(new Uint8Array(await data.arrayBuffer()),"image/webp").catch(()=>{throw new CatalogProblem("PHOTO_UNAVAILABLE");});
 if(await photoReference(session,customer,product)!==path)throw new CatalogProblem("PHOTO_UNAVAILABLE");
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch(e){return catalogError(e);}}
