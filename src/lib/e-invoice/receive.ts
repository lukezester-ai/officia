interface Invoice {
    id: string;
    // други полета...
}

// Cron job всеки час
export async function fetchInvoicesFromNAP(tenantId: string): Promise<Invoice[]> {
  const company = await getCompanyDetails(tenantId);
  const soapRequest = buildFetchInvoicesSoap(company.bulstat);
  const response = await sendSoapRequest('https://ei.nap.bg/EPEP/InvoiceRegistration/GetIncoming', soapRequest);
  const invoices = parseIncomingInvoices(response);
  
  for (const invoice of invoices) {
    await saveReceivedInvoice(tenantId, invoice);
  }
  
  return invoices;
}

// Mocks за успешна TypeScript компилация
async function getCompanyDetails(tenantId: string) { return { bulstat: '123456789' }; }
function buildFetchInvoicesSoap(bulstat: string) { return '<soap></soap>'; }
async function sendSoapRequest(endpoint: string, soap: string) { return '<response></response>'; }
function parseIncomingInvoices(response: string): Invoice[] { return []; }
async function saveReceivedInvoice(tenantId: string, invoice: Invoice) {}
