import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type AccountRow = {
  accountCode?: string;
  accountName?: string;
  balance?: number;
  amount?: number;
};

type GroupedAccounts = Record<string, AccountRow[]>;

type BalanceReportData = {
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalLiabilitiesAndEquity?: number;
  assets?: GroupedAccounts;
  liabilities?: GroupedAccounts;
  equity?: GroupedAccounts;
};

type PnlReportData = {
  revenue?: { total?: number; breakdown?: AccountRow[] };
  expenses?: { total?: number; breakdown?: AccountRow[] };
  netProfit?: number;
};

type TaxReportData = {
  periodStart?: string;
  periodEnd?: string;
  salesVAT?: number;
  purchasesVAT?: number;
  payableVAT?: number;
};

type ExcelRow = Record<string, string | number>;

export class ReportExporter {
  static async exportToExcel(data: BalanceReportData | PnlReportData, reportType: string, period: string) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Officia ERP';
    wb.lastModifiedBy = 'Officia ERP';
    wb.created = new Date();

    const titleStyle = {
      font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A8A' } },
    };
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF334155' } },
      alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
    };
    const moneyFormat = '#,##0.00 \\€';

    const addSummarySheet = (sheetName: string, title: string, rows: Array<[string, string | number]>) => {
      const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 30 }, { width: 25 }];

      ws.addRow([title, '']).eachCell((c) => {
        c.font = titleStyle.font;
        c.fill = titleStyle.fill;
      });
      ws.addRow(['Период:', period]).font = { bold: true };
      ws.addRow([]);

      rows.forEach((r) => {
        const row = ws.addRow(r);
        if (typeof r[1] === 'number') {
          row.getCell(2).numFmt = moneyFormat;
          row.getCell(2).alignment = { horizontal: 'right' };
        }
      });
    };

    const addDataSheet = (sheetName: string, headers: string[], items: ExcelRow[]) => {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));

      const headerRow = ws.getRow(1);
      headerRow.eachCell((c) => {
        c.font = headerStyle.font;
        c.fill = headerStyle.fill;
        c.alignment = headerStyle.alignment;
      });
      headerRow.height = 25;

      items.forEach((item) => {
        const row = ws.addRow(item);
        const amountCell = row.getCell('Сума');
        if (amountCell) {
          amountCell.numFmt = moneyFormat;
          amountCell.alignment = { horizontal: 'right' };
        }
      });

      ws.columns.forEach((col) => {
        let maxLen = col.header ? String(col.header).length : 10;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
          if (cell.value && cell.value.toString().length > maxLen) {
            maxLen = cell.value.toString().length;
          }
        });
        col.width = maxLen + 5;
      });
    };

    if (reportType === 'balance') {
      const balance = data as BalanceReportData;
      addSummarySheet('Summary', 'Баланс - Обобщение', [
        ['Общо Активи', Number(balance.totalAssets || 0)],
        ['Общо Пасиви', Number(balance.totalLiabilities || 0)],
        ['Общо Капитал', Number(balance.totalEquity || 0)],
        ['Общо Пасиви и Капитал', Number(balance.totalLiabilitiesAndEquity || 0)],
        [
          'Балансиран',
          Math.abs(Number(balance.totalAssets) - Number(balance.totalLiabilitiesAndEquity)) < 1 ? 'Да' : 'Не',
        ],
      ]);
      addDataSheet('Assets', ['Група', 'Код', 'Име', 'Сума'], this.formatCategoryForExcel(balance.assets, 'Активи'));
      addDataSheet(
        'Liabilities',
        ['Група', 'Код', 'Име', 'Сума'],
        this.formatCategoryForExcel(balance.liabilities, 'Пасиви'),
      );
      addDataSheet('Equity', ['Група', 'Код', 'Име', 'Сума'], this.formatCategoryForExcel(balance.equity, 'Капитал'));
    } else if (reportType === 'pnl') {
      const pnl = data as PnlReportData;
      addSummarySheet('Summary', 'P&L - Обобщение', [
        ['Общо Приходи', Number(pnl.revenue?.total || 0)],
        ['Общо Разходи', Number(pnl.expenses?.total || 0)],
        ['Нетен Резултат', Number(pnl.netProfit || 0)],
      ]);
      addDataSheet('P&L Details', ['Група', 'Код', 'Име', 'Сума'], this.formatPnLForExcel(pnl));
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${reportType}_${period}.xlsx`);
  }

  static exportBalanceToPDF(data: BalanceReportData, companyName: string, period: string) {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('БАЛАНС', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, pageWidth / 2, 26, { align: 'center' });
    doc.text(`Към: ${period}`, pageWidth / 2, 32, { align: 'center' });

    let y = 50;

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('Обобщение', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Общо Активи: ${Number(data.totalAssets ?? 0).toFixed(2)} €`, 20, y);
    y += 7;
    doc.text(`Общо Пасиви и Капитал: ${Number(data.totalLiabilitiesAndEquity ?? 0).toFixed(2)} €`, 20, y);
    y += 12;

    doc.setFontSize(13);
    doc.text('АКТИВИ', 20, y);
    y += 8;

    doc.autoTable({
      startY: y,
      head: [['Код', 'Наименование', 'Сума (€)']],
      body: this.prepareTableData(data.assets),
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable.finalY + 15;

    doc.text('ПАСИВИ И СОБСТВЕН КАПИТАЛ', 20, y);
    y += 8;

    const liabTable = [
      ...this.prepareTableData(data.liabilities),
      ...this.prepareTableData(data.equity),
    ];

    doc.autoTable({
      startY: y,
      head: [['Код', 'Наименование', 'Сума (€)']],
      body: liabTable,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 226, 226] },
      styles: { fontSize: 10 },
    });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Генерирано на: ${new Date().toLocaleDateString('bg-BG')}`, 20, 290);
    doc.text('Страница 1', pageWidth - 30, 290);

    doc.save(`Баланс_${companyName.replace(/\s+/g, '_')}_${period}.pdf`);
  }

  static exportToPDF(
    data: BalanceReportData | PnlReportData,
    reportType: string,
    period: string,
    companyName: string,
  ) {
    if (reportType === 'balance') {
      return this.exportBalanceToPDF(data as BalanceReportData, companyName, period);
    }

    const pnl = data as PnlReportData;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Profit and Loss', 105, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(companyName, 105, 28, { align: 'center' });
    doc.text(period, 105, 35, { align: 'center' });

    const rows = [
      ['Revenue', Number(pnl.revenue?.total || 0).toFixed(2)],
      ['Expenses', Number(pnl.expenses?.total || 0).toFixed(2)],
      ['Net result', Number(pnl.netProfit || 0).toFixed(2)],
    ];

    doc.autoTable({
      startY: 48,
      head: [['Metric', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    });

    doc.save(`pnl_${period}.pdf`);
  }

  private static prepareTableData(grouped?: GroupedAccounts | AccountRow[]) {
    const rows: string[][] = [];
    if (!grouped) return rows;

    if (Array.isArray(grouped)) {
      grouped.forEach((acc) => {
        rows.push([acc.accountCode || '', acc.accountName || '', Math.abs(acc.balance || 0).toFixed(2)]);
      });
      return rows;
    }

    Object.keys(grouped).forEach((category) => {
      grouped[category]?.forEach((acc) => {
        rows.push([acc.accountCode || '', acc.accountName || '', Math.abs(acc.balance || 0).toFixed(2)]);
      });
    });
    return rows;
  }

  static exportTaxDeclaration(report: TaxReportData, type: string, companyName: string) {
    if (type !== 'dds') return;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('СПРАВКА-ДЕКЛАРАЦИЯ ПО ЗДДС', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, pageWidth / 2, 26, { align: 'center' });
    doc.text(`За период: ${report.periodStart} - ${report.periodEnd}`, pageWidth / 2, 32, { align: 'center' });

    doc.setTextColor(0);
    let y = 50;
    doc.text(`ДДС Продажби: ${Number(report.salesVAT).toFixed(2)} €`, 20, y);
    y += 10;
    doc.text(`ДДС Покупки: ${Number(report.purchasesVAT).toFixed(2)} €`, 20, y);
    y += 10;
    doc.text(`ДДС за внасяне: ${Number(report.payableVAT).toFixed(2)} €`, 20, y);

    doc.save(`DDS_${companyName.replace(/\s+/g, '_')}_${report.periodStart}.pdf`);
  }

  private static formatCategoryForExcel(categoryData?: GroupedAccounts, categoryName?: string): ExcelRow[] {
    const result: ExcelRow[] = [];
    if (!categoryData) return result;

    Object.values(categoryData).forEach((arr) => {
      arr.forEach((item) => {
        result.push({
          Група: categoryName || '',
          Код: item.accountCode || '',
          Име: item.accountName || '',
          Сума: item.balance ?? 0,
        });
      });
    });
    return result;
  }

  private static formatPnLForExcel(data: PnlReportData): ExcelRow[] {
    const result: ExcelRow[] = [];

    data.revenue?.breakdown?.forEach((item) => {
      result.push({
        Група: 'ПРИХОДИ',
        Код: item.accountCode || '',
        Име: item.accountName || '',
        Сума: item.amount ?? 0,
      });
    });

    data.expenses?.breakdown?.forEach((item) => {
      result.push({
        Група: 'РАЗХОДИ',
        Код: item.accountCode || '',
        Име: item.accountName || '',
        Сума: item.amount ?? 0,
      });
    });

    return result;
  }
}
