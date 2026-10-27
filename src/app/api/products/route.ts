import type { NextRequest } from "next/server";
import { privateJson } from "@/modules/identity/http";
import { productQuery } from "@/modules/products/contracts";
import { findProducts } from "@/modules/products/service";
import { productHttpError } from "@/modules/products/http";
export async function GET(request: NextRequest) {
  try { const result = await findProducts(productQuery(request.nextUrl.searchParams)); return privateJson({ data: result.data }); }
  catch (error) { return productHttpError(error); }
}
