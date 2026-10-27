import { describe,it,expect } from "vitest";
import { companyInput,invitationInput,safeAdminMessage } from "./admin-contracts";
const key="00000000-0000-4000-8000-000000000001";
function form(values:Record<string,string>) {const data=new FormData();Object.entries(values).forEach(([k,v])=>data.set(k,v));return data;}
describe("entradas administrativas",()=>{
  it("valida revisão, contatos e allowlist de endereço sem aceitar campos extras",()=>{
    const values={legal_name:" Empresa ",trade_name:"Nome",revision:"1",key,email:"Contato@Example.test",phone:"(11) 9999-0000",street:"Rua",number:"1",district:"Centro",city:"Cidade",state:"sp",postal_code:"00000-000",tenant_id:key};
    expect(companyInput(form(values))).toMatchObject({legalName:"Empresa",contact:{email:"contato@example.test"},address:{state:"SP"}});
    for(const invalid of [{revision:"0"},{revision:"1.5"},{legal_name:" "},{phone:"<script>"},{email:"inválido"},{state:"SPX"},{key:"forjado"}]) expect(()=>companyInput(form({...values,...invalid}))).toThrow("VALIDATION_ERROR");
    expect(companyInput(form(values))).not.toHaveProperty("tenant_id");
  });
  it("comprador exige UUID de cliente; funções internas não recebem cliente",()=>{
    expect(invitationInput(form({email:"x@example.test",role:"buyer",customer_id:key,key})).customerId).toBe(key);
    expect(invitationInput(form({email:"x@example.test",role:"seller",customer_id:"",key})).customerId).toBeNull();
    for(const invalid of [{role:"owner",customer_id:""},{role:"buyer",customer_id:""},{role:"seller",customer_id:key}]) expect(()=>invitationInput(form({email:"x@example.test",key,...invalid}))).toThrow("VALIDATION_ERROR");
  });
  it("erros desconhecidos não expõem detalhes de SQL, SMTP ou Auth",()=>{
    expect(safeAdminMessage("secret-provider-error")).not.toContain("secret");
    expect(safeAdminMessage("LAST_ADMIN")).toContain("administrador ativo");
  });
});
