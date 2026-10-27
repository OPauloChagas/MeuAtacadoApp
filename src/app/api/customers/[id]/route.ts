import { privateJson } from "@/modules/identity/http";
import { findCustomer } from "@/modules/customers/service";
import { customerHttpError } from "@/modules/customers/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return privateJson({ data: (await findCustomer((await params).id)).data }); }
  catch (error) { return customerHttpError(error); }
}
