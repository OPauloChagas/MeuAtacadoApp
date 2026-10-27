import type { NextRequest } from "next/server";
import { privateJson } from "@/modules/identity/http";
import { findCustomers } from "@/modules/customers/service";
import { listQuery } from "@/modules/customers/contracts";
import { customerHttpError } from "@/modules/customers/http";

export async function GET(request: NextRequest) {
  try { return privateJson({ data: (await findCustomers(listQuery(request.nextUrl.searchParams))).data }); }
  catch (error) { return customerHttpError(error); }
}
