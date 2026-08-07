import { format } from 'date-fns';

export interface UblInvoiceData {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  currency: string;
  supplier: {
    name: string;
    vatNumber: string;
    companyId: string;
    address: string;
  };
  customer: {
    name: string;
    vatNumber: string;
    companyId?: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
  }>;
  totals: {
    netAmount: number;
    vatAmount: number;
    payableAmount: number;
  };
}

/**
 * Generates a standard UBL 2.1 XML (EN 16931 compliant) for e-Invoicing.
 */
export function generateUblXml(data: UblInvoiceData): string {
  const issueDateStr = typeof data.issueDate === 'string' ? data.issueDate : format(data.issueDate, 'yyyy-MM-dd');
  const dueDateStr = typeof data.dueDate === 'string' ? data.dueDate : format(data.dueDate, 'yyyy-MM-dd');
  
  const escape = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  const generateLines = () => {
    return data.items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="EA">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${data.currency}">${item.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Description>${escape(item.description)}</cbc:Description>
            <cbc:Name>${escape(item.description)}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${data.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('');
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.0</cbc:CustomizationID>
    <cbc:ID>${escape(data.invoiceNumber)}</cbc:ID>
    <cbc:IssueDate>${issueDateStr}</cbc:IssueDate>
    <cbc:DueDate>${dueDateStr}</cbc:DueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${escape(data.supplier.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escape(data.supplier.address)}</cbc:StreetName>
                <cac:Country>
                    <cbc:IdentificationCode>BG</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${escape(data.supplier.vatNumber)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escape(data.supplier.name)}</cbc:RegistrationName>
                <cbc:CompanyID>${escape(data.supplier.companyId)}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${escape(data.customer.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escape(data.customer.address)}</cbc:StreetName>
                <cac:Country>
                    <cbc:IdentificationCode>BG</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${escape(data.customer.vatNumber)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escape(data.customer.name)}</cbc:RegistrationName>
                ${data.customer.companyId ? `<cbc:CompanyID>${escape(data.customer.companyId)}</cbc:CompanyID>` : ''}
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${data.currency}">${data.totals.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${data.currency}">${data.totals.netAmount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${data.currency}">${data.totals.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>20.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${data.currency}">${data.totals.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${data.currency}">${data.totals.netAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${data.currency}">${data.totals.payableAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${data.currency}">${data.totals.payableAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    ${generateLines()}
</Invoice>`;
}
