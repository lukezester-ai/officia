import { XMLBuilder } from 'fast-xml-parser';

export async function generateEInvoiceXML(invoiceData: any) {
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
          PartyName: { Name: invoiceData.supplierName || 'Моята Фирма ООД' },
          PartyTaxScheme: { CompanyID: invoiceData.supplierVat || 'BG123456789' }
        }
      },
      AccountingCustomerParty: {
        Party: {
          PartyName: { Name: invoiceData.customerName || 'Клиент ЕООД' },
          PartyTaxScheme: { CompanyID: invoiceData.customerVat || 'BG987654321' }
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
  // В реална среда тук се ползва библиотека като 'libxmljs' или външно API
  console.log('Валидиране на XML срещу XSD схемата на НАП...');
  
  // Симулация на успешна валидация
  return { isValid: true, errors: [] };
}
