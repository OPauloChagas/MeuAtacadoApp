import "server-only";
import { AccessFailure } from "@/modules/identity/session";
import { privateJson } from "@/modules/identity/http";
import { message,problemCode,CatalogProblem } from "./contracts";
export function catalogError(error:unknown) {const code=error instanceof AccessFailure?error.status===401?"UNAUTHENTICATED":error.status===403?"ACCESS_DENIED":"UNAVAILABLE":problemCode(error);
 return privateJson({error:{code,message:code==="UNAUTHENTICATED"?"Entre para continuar.":message(code),fields:{}}},code==="UNAUTHENTICATED"?401:code==="ACCESS_DENIED"?403:code==="PHOTO_UNAVAILABLE"?404:code==="UNAVAILABLE"?503:422);
}
/** Bound bytes before decoding; no request.json() allocation on arbitrary bodies. */
export async function quoteBody(request: Request):Promise<unknown> {
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw new CatalogProblem("VALIDATION_ERROR");
 const reader=request.body?.getReader();if(!reader)throw new CatalogProblem("VALIDATION_ERROR");let size=0;const chunks:Uint8Array[]=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw new CatalogProblem("VALIDATION_ERROR");}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new CatalogProblem("VALIDATION_ERROR");}
}
