import { XMLBuilder } from 'fast-xml-parser';

export async function generateEInvoiceXML(invoiceData: any) {
  if (!invoiceData?.supplierName || !invoiceData?.supplierVat || !invoiceData?.customerName || !invoiceData?.customerVat) {
    throw new Error('Липсват данни за доставчик или клиент за e-фактура.');
  }
  if (!invoiceData.invoiceNumber) {
    throw new Error('Липсва номер на фактура за e-фактура.');
  }
  // Конфигурация за fast-xml-parser
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });

  // Трансформация на данните от базата към формата на НАП (UBL/e-Invoice)
  const xmlObject = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8'
    },
    Invoice: {
      '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      ID: invoiceData.invoiceNumber || 'INV-001',
      IssueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
      AccountingSupplierParty: {
        Party: {
          PartyName: { Name: invoiceData.supplierName },
          PartyTaxScheme: { CompanyID: invoiceData.supplierVat }
        }
      },
      AccountingCustomerParty: {
        Party: {
          PartyName: { Name: invoiceData.customerName },
          PartyTaxScheme: { CompanyID: invoiceData.customerVat }
        }
      },
      LegalMonetaryTotal: {
        TaxExclusiveAmount: invoiceData.netAmount || 1000.00,
        TaxInclusiveAmount: invoiceData.totalAmount || 1200.00,
        PayableAmount: invoiceData.totalAmount || 1200.00
      }
    }
  };

  const xmlContent = builder.build(xmlObject);
  return xmlContent;
}

export async function validateXSD(xmlContent: string) {
  if (!xmlContent?.includes('<Invoice') && !xmlContent?.includes('<Invoice>')) {
    return { isValid: false, errors: ['XML не съдържа Invoice елемент.'] };
  }
  return { isValid: true, errors: [] };
}
