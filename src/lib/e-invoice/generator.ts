import { XMLBuilder } from 'fast-xml-parser';

export interface InvoiceItem {
  quantity: number;
  unitCode?: string;
  unitPrice: number;
  totalNet: number;
  vatAmount: number;
  vatRate: number;
  description: string;
}

export interface Invoice {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientVat: string;
  items: InvoiceItem[];
  totalNet: number;
  totalGross: number;
}

export interface Company {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  bulstat: string;
}

export function generateNAPInvoiceXml(invoice: Invoice, company: Company): string {
  const invoiceXml = {
    'Invoice': {
      '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      '@_xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      '@_xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'cbc:UBLVersionID': '2.1',
      'cbc:CustomizationID': 'BG-NAP-1.0',
      'cbc:ProfileID': 'BG:NAP:eInvoice:1.0',
      'cbc:ID': invoice.invoiceNumber,
      'cbc:IssueDate': invoice.issueDate.toISOString().split('T')[0],
      'cbc:DueDate': invoice.dueDate.toISOString().split('T')[0],
      'cbc:InvoiceTypeCode': '380',
      'cbc:DocumentCurrencyCode': invoice.currency,
      'cac:AccountingSupplierParty': {
        'cac:Party': {
          'cac:PartyName': { 'cbc:Name': company.name },
          'cac:PostalAddress': {
            'cbc:StreetName': company.address,
            'cbc:CityName': company.city,
            'cbc:PostalZone': company.postalCode,
            'cac:Country': { 'cbc:IdentificationCode': 'BG' }
          },
          'cac:PartyTaxScheme': {
            'cbc:CompanyID': company.bulstat,
            'cac:TaxScheme': { 'cbc:ID': 'VAT' }
          }
        }
      },
      'cac:AccountingCustomerParty': {
        'cac:Party': {
          'cac:PartyName': { 'cbc:Name': invoice.clientName },
          'cac:PostalAddress': {
            'cbc:StreetName': invoice.clientAddress,
            'cbc:CityName': invoice.clientCity,
            'cac:Country': { 'cbc:IdentificationCode': 'BG' }
          },
          'cac:PartyTaxScheme': {
            'cbc:CompanyID': invoice.clientVat,
            'cac:TaxScheme': { 'cbc:ID': 'VAT' }
          }
        }
      },
      'cac:InvoiceLine': invoice.items.map((item, idx) => ({
        'cbc:ID': idx + 1,
        'cbc:InvoicedQuantity': { '@_unitCode': item.unitCode || 'HUR', '#text': item.quantity },
        'cbc:LineExtensionAmount': item.totalNet,
        'cac:Item': { 'cbc:Name': item.description },
        'cac:Price': { 'cbc:PriceAmount': item.unitPrice },
        'cac:TaxTotal': {
          'cac:TaxSubtotal': {
            'cbc:TaxableAmount': item.totalNet,
            'cbc:TaxAmount': item.vatAmount,
            'cac:TaxCategory': {
              'cac:TaxScheme': { 'cbc:ID': 'VAT', 'cbc:Name': `${item.vatRate}%` }
            }
          }
        }
      })),
      'cac:LegalMonetaryTotal': {
        'cbc:LineExtensionAmount': invoice.totalNet,
        'cbc:TaxExclusiveAmount': invoice.totalNet,
        'cbc:TaxInclusiveAmount': invoice.totalGross,
        'cbc:PayableAmount': invoice.totalGross
      }
    }
  };
  
  const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
  return builder.build(invoiceXml);
}
