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

/**
 * Генерира XML файл за Декларации Образец 1 и Образец 6 към НАП (ТРЗ и Данъци).
 */
export function generatePayrollDeclarationXml(
  employeesData: Array<{ pin?: string; firstName: string; lastName: string; grossSalary: number; insuranceBase: number; dooEmp: number; dzpoEmp: number; zoEmp: number; ddfl: number }>,
  year: number,
  month: number,
  companyEik: string = "123456789"
): string {
  let totalDoo = 0;
  let totalDzpo = 0;
  let totalZo = 0;
  let totalDdfl = 0;

  const personsXml = employeesData.map((e, idx) => {
    totalDoo += e.dooEmp || 0;
    totalDzpo += e.dzpoEmp || 0;
    totalZo += e.zoEmp || 0;
    totalDdfl += e.ddfl || 0;

    return `    <Person Row="${idx + 1}">
      <PIN>${e.pin || '0000000000'}</PIN>
      <Names>${e.firstName} ${e.lastName}</Names>
      <InsuredDays>21</InsuredDays>
      <InsuranceBase>${(e.insuranceBase || 0).toFixed(2)}</InsuranceBase>
      <EmployeeDOO>${(e.dooEmp || 0).toFixed(2)}</EmployeeDOO>
      <EmployeeDZPO>${(e.dzpoEmp || 0).toFixed(2)}</EmployeeDZPO>
      <EmployeeZO>${(e.zoEmp || 0).toFixed(2)}</EmployeeZO>
      <IncomeTaxDDFL>${(e.ddfl || 0).toFixed(2)}</IncomeTaxDDFL>
    </Person>`;
  }).join('\r\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<NAP_Payroll_Declarations Year="${year}" Month="${String(month).padStart(2, '0')}" EIK="${companyEik}" Software="Officia BG ERP">
  <Declaration1_Persons>
${personsXml}
  </Declaration1_Persons>
  <Declaration6_Summary>
    <TotalDOO>${totalDoo.toFixed(2)}</TotalDOO>
    <TotalDZPO>${totalDzpo.toFixed(2)}</TotalDZPO>
    <TotalZO>${totalZo.toFixed(2)}</TotalZO>
    <TotalDDFL>${totalDdfl.toFixed(2)}</TotalDDFL>
    <StatutoryDueDate>${year}-${String(month + 1).padStart(2, '0')}-14</StatutoryDueDate>
  </Declaration6_Summary>
</NAP_Payroll_Declarations>`;
}

/**
 * TICKET 7: Масов експорт на всички счетоводни, ДДС и ТРЗ файлове в един обединен ZIP пакет за НАП.
 */
export async function generateFullBatchNapZip(
  vatRecords: VatRecord[],
  employeesData: any[],
  companyVat: string,
  year: number,
  month: number
): Promise<Buffer> {
  const sales = vatRecords.filter(r => r.type === 'sales');
  const purchases = vatRecords.filter(r => r.type === 'purchases');

  const salesLines = sales.map(r => formatSalesRow(r, companyVat));
  const purchasesLines = purchases.map(r => formatPurchasesRow(r, companyVat));

  const salesContent = salesLines.join('\r\n') + (salesLines.length > 0 ? '\r\n' : '');
  const purchasesContent = purchasesLines.join('\r\n') + (purchasesLines.length > 0 ? '\r\n' : '');

  const salesBuffer = iconv.encode(salesContent, 'win1251');
  const purchasesBuffer = iconv.encode(purchasesContent, 'win1251');
  const deklarBuffer = iconv.encode(`ДДС Декларация за период ${month}/${year}\r\nИН по ЗДДС: ${companyVat}`, 'win1251');

  const payrollXml = generatePayrollDeclarationXml(employeesData, year, month, companyVat.replace(/^BG/, ''));
  const payrollBuffer = Buffer.from(payrollXml, 'utf-8');

  const zip = new JSZip();
  const vatFolder = zip.folder('DDS_Ledgers_NAP');
  if (vatFolder) {
    vatFolder.file('PRODAJBI.TXT', salesBuffer);
    vatFolder.file('POKUPKI.TXT', purchasesBuffer);
    vatFolder.file('DEKLAR.TXT', deklarBuffer);
  } else {
    zip.file('PRODAJBI.TXT', salesBuffer);
    zip.file('POKUPKI.TXT', purchasesBuffer);
    zip.file('DEKLAR.TXT', deklarBuffer);
  }

  const payrollFolder = zip.folder('Payroll_TRZ_NAP');
  if (payrollFolder) {
    payrollFolder.file(`OBRAZEC_1_6_${month}_${year}.xml`, payrollBuffer);
  } else {
    zip.file(`OBRAZEC_1_6_${month}_${year}.xml`, payrollBuffer);
  }

  return await zip.generateAsync({ type: 'nodebuffer' });
}
