import iconv from 'iconv-lite';
import JSZip from 'jszip';

export interface VatRecord {
  id: string;
  type: 'sales' | 'purchases';
  periodYear: number;
  periodMonth: number;
  entryDate: string;
  documentNumber: string;
  counterpartyName: string;
  counterpartyVat: string;
  invoiceNumber: string;
  invoiceDate: string;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
  isIntraCommunity?: boolean;
}

/**
 * Хелпър за форматиране на поле с фиксирана дължина
 */
function padString(str: string | null | undefined, length: number, padChar: string = ' ', alignRight: boolean = false): string {
  const s = (str || '').substring(0, length);
  if (alignRight) {
    return s.padStart(length, padChar);
  }
  return s.padEnd(length, padChar);
}

function formatNumber(num: number | null | undefined, length: number): string {
  // НАП изисква числата да са с 2 знака след запетаята и закръглени
  if (num === null || num === undefined) num = 0;
  const s = num.toFixed(2);
  return s.padStart(length, ' ');
}

/**
 * Генерира един ред за PRODAJBI.TXT (Дневник Продажби)
 * ВНИМАНИЕ: Това е опростена MVP структура според Приложение 12. 
 * Реалната има 39 колони с точни дължини.
 */
function formatSalesRow(record: VatRecord, companyVat: string): string {
  // Примерна структура (трябва да се адаптира към точната наредба за 2026)
  const branch = padString('0000', 4); // Код на клон
  const vatNum = padString(companyVat, 15); // ИН по ЗДДС на регистрираното лице
  const period = padString(`${record.periodYear}${String(record.periodMonth).padStart(2, '0')}`, 6); // Период
  const docType = padString('01', 2); // 01-Фактура
  const docNum = padString(record.invoiceNumber || record.documentNumber, 10);
  const docDate = padString(record.invoiceDate ? record.invoiceDate.replace(/-/g, '') : '', 8);
  const cpName = padString(record.counterpartyName, 50);
  const cpVat = padString(record.counterpartyVat, 15);
  
  // Данъчни основи и ДДС (в зависимост от ставката)
  const is20 = record.vatRate === 20;
  const base20 = is20 ? formatNumber(record.netAmount, 15) : formatNumber(0, 15);
  const vat20 = is20 ? formatNumber(record.vatAmount, 15) : formatNumber(0, 15);
  const total = formatNumber(record.totalAmount, 15);

  // Слепваме всички полета без разделител
  return `${branch}${vatNum}${period}${docType}${docNum}${docDate}${cpName}${cpVat}${base20}${vat20}${total}`;
}

/**
 * Генерира един ред за POKUPKI.TXT (Дневник Покупки)
 */
function formatPurchasesRow(record: VatRecord, companyVat: string): string {
  const branch = padString('0000', 4); 
  const vatNum = padString(companyVat, 15); 
  const period = padString(`${record.periodYear}${String(record.periodMonth).padStart(2, '0')}`, 6); 
  const docType = padString('01', 2); // 01-Фактура
  const docNum = padString(record.invoiceNumber || record.documentNumber, 10);
  const docDate = padString(record.invoiceDate ? record.invoiceDate.replace(/-/g, '') : '', 8);
  const cpName = padString(record.counterpartyName, 50);
  const cpVat = padString(record.counterpartyVat, 15);
  
  const is20 = record.vatRate === 20;
  const base20 = is20 ? formatNumber(record.netAmount, 15) : formatNumber(0, 15);
  const vat20 = is20 ? formatNumber(record.vatAmount, 15) : formatNumber(0, 15);
  const total = formatNumber(record.totalAmount, 15);

  return `${branch}${vatNum}${period}${docType}${docNum}${docDate}${cpName}${cpVat}${base20}${vat20}${total}`;
}

/**
 * Генерира ZIP архив с TXT файлове, кодирани в Windows-1251
 */
export async function generateNapExportArchive(
  records: VatRecord[], 
  companyVat: string, 
  year: number, 
  month: number
): Promise<Buffer> {
  const sales = records.filter(r => r.type === 'sales');
  const purchases = records.filter(r => r.type === 'purchases');

  const salesLines = sales.map(r => formatSalesRow(r, companyVat));
  const purchasesLines = purchases.map(r => formatPurchasesRow(r, companyVat));

  // НАП изисква CRLF (\r\n) за край на ред
  const salesContent = salesLines.join('\r\n') + (salesLines.length > 0 ? '\r\n' : '');
  const purchasesContent = purchasesLines.join('\r\n') + (purchasesLines.length > 0 ? '\r\n' : '');

  // Конвертираме от UTF-8 към Windows-1251
  const salesBuffer = iconv.encode(salesContent, 'win1251');
  const purchasesBuffer = iconv.encode(purchasesContent, 'win1251');

  // Създаваме ZIP архив
  const zip = new JSZip();
  zip.file('PRODAJBI.TXT', salesBuffer);
  zip.file('POKUPKI.TXT', purchasesBuffer);
  
  // Можем да добавим и празен DEKLAR.TXT, ако е нужно
  zip.file('DEKLAR.TXT', iconv.encode('', 'win1251'));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return zipBuffer;
}
