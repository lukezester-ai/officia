// @ts-nocheck
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export class ReportExporter {

  // ==================== EXCEL ====================
  static async exportToExcel(data: any, reportType: string, period: string) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Officia ERP';
    wb.lastModifiedBy = 'Officia ERP';
    wb.created = new Date();

    const titleStyle = { font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } } };
    const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }, alignment: { vertical: 'middle', horizontal: 'center' } };
    const moneyFormat = '#,##0.00 \\€';

    const addSummarySheet = (sheetName: string, title: string, rows: any[]) => {
      const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 30 }, { width: 25 }];
      
      ws.addRow([title, '']).eachCell(c => { c.font = titleStyle.font; c.fill = titleStyle.fill as any; });
      ws.addRow(['Период:', period]).font = { bold: true };
      ws.addRow([]);
      
      rows.forEach(r => {
        const row = ws.addRow(r);
        if (typeof r[1] === 'number') {
          row.getCell(2).numFmt = moneyFormat;
          row.getCell(2).alignment = { horizontal: 'right' };
        }
      });
    };

    const addDataSheet = (sheetName: string, headers: string[], items: any[]) => {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
      
      const headerRow = ws.getRow(1);
      headerRow.eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill as any; c.alignment = headerStyle.alignment as any; });
      headerRow.height = 25;

      items.forEach(item => {
        const row = ws.addRow(item);
        const amountCell = row.getCell('Сума');
        if (amountCell) {
          amountCell.numFmt = moneyFormat;
          amountCell.alignment = { horizontal: 'right' };
        }
      });

      // Auto-fit columns
      ws.columns.forEach(col => {
        let maxLen = col.header ? col.header.length : 10;
        col.eachCell({ includeEmpty: false }, cell => {
          if (cell.value && cell.value.toString().length > maxLen) {
            maxLen = cell.value.toString().length;
          }
        });
        col.width = maxLen + 5;
      });
    };

    if (reportType === 'balance') {
      addSummarySheet('Summary', 'Баланс - Обобщение', [
        ['Общо Активи', Number(data.totalAssets || 0)],
        ['Общо Пасиви', Number(data.totalLiabilities || 0)],
        ['Общо Капитал', Number(data.totalEquity || 0)],
        ['Общо Пасиви и Капитал', Number(data.totalLiabilitiesAndEquity || 0)],
        ['Балансиран', Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 1 ? "Да" : "Не"]
      ]);
      addDataSheet('Assets', ['Група', 'Код', 'Име', 'Сума'], this.formatCategoryForExcel(data.assets, 'Активи'));
      addDataSheet('Liabilities', ['Група', 'Код', 'Име', 'Сума'], this.formatCategoryForExcel(data.liabilities, 'Пасиви'));
      addDataSheet('Equity', ['Група', 'Код', 'Име', 'Сума'], this.formatCategoryForExcel(data.equity, 'Капитал'));
    } else if (reportType === 'pnl') {
      addSummarySheet('Summary', 'P&L - Обобщение', [
        ['Общо Приходи', Number(data.revenue?.total || 0)],
        ['Общо Разходи', Number(data.expenses?.total || 0)],
        ['Нетен Резултат', Number(data.netProfit || 0)]
      ]);
      addDataSheet('P&L Details', ['Група', 'Код', 'Име', 'Сума'], this.formatPnLForExcel(data));
    }

    // Write file to browser
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${reportType}_${period}.xlsx`);
  }

  // ==================== PDF ====================
  static exportBalanceToPDF(data: any, companyName: string, period: string) {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 58, 138); // blue-800
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("БАЛАНС", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.text(companyName, pageWidth / 2, 26, { align: "center" });
    doc.text(`Към: ${period}`, pageWidth / 2, 32, { align: "center" });

    let y = 50;

    // Summary
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("Обобщение", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Общо Активи: ${data.totalAssets.toFixed(2)} €`, 20, y);
    y += 7;
    doc.text(`Общо Пасиви и Капитал: ${data.totalLiabilitiesAndEquity.toFixed(2)} €`, 20, y);
    y += 12;

    // Assets Table
    doc.setFontSize(13);
    doc.text("АКТИВИ", 20, y);
    y += 8;

    const assetsTable = this.prepareTableData(data.assets);
    (doc as any).autoTable({
      startY: y,
      head: [['Код', 'Наименование', 'Сума (€)']],
      body: assetsTable,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Liabilities Table
    doc.text("ПАСИВИ И СОБСТВЕН КАПИТАЛ", 20, y);
    y += 8;

    const liabTable = [
      ...this.prepareTableData(data.liabilities || {}), 
      ...this.prepareTableData(data.equity || {})
    ];
    
    (doc as any).autoTable({
      startY: y,
      head: [['Код', 'Наименование', 'Сума (€)']],
      body: liabTable,
      theme: 'grid',
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 226, 226] },
      styles: { fontSize: 10 },
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Генерирано на: ${new Date().toLocaleDateString('bg-BG')}`, 20, 290);
    doc.text(`Страница 1 от ${pageCount}`, pageWidth - 30, 290);

    doc.save(`Баланс_${companyName.replace(/\s+/g, '_')}_${period}.pdf`);
  }

  static exportToPDF(data: any, reportType: string, period: string, companyName: string) {
    if (reportType === 'balance') {
      return this.exportBalanceToPDF(data, companyName, period);
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Profit and Loss', 105, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(companyName, 105, 28, { align: 'center' });
    doc.text(period, 105, 35, { align: 'center' });

    const rows = [
      ['Revenue', Number(data.revenue?.total || 0).toFixed(2)],
      ['Expenses', Number(data.expenses?.total || 0).toFixed(2)],
      ['Net result', Number(data.netProfit || 0).toFixed(2)],
    ];

    (doc as any).autoTable({
      startY: 48,
      head: [['Metric', 'Amount']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    });

    doc.save('pnl_' + period + '.pdf');
  }

  private static prepareTableData(grouped: any) {
    const rows: any[] = [];
    if (!grouped) return rows;
    
    // Check if it's already an array (in case data format changes)
    if (Array.isArray(grouped)) {
       grouped.forEach((acc: any) => {
         rows.push([acc.accountCode || '', acc.accountName || '', Math.abs(acc.balance || 0).toFixed(2)]);
       });
       return rows;
    }
    
    // Process as grouped object
    Object.keys(grouped).forEach(category => {
      if (Array.isArray(grouped[category])) {
        grouped[category].forEach((acc: any) => {
          rows.push([
            acc.accountCode,
            acc.accountName,
            Math.abs(acc.balance).toFixed(2)
          ]);
        });
      }
    });
    return rows;
  }

  static exportTaxDeclaration(report: any, type: string, companyName: string) {
    if (type === 'dds') {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFillColor(185, 28, 28); // Red for tax
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("СПРАВКА-ДЕКЛАРАЦИЯ ПО ЗДДС", pageWidth / 2, 18, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(companyName, pageWidth / 2, 26, { align: "center" });
      doc.text(`За период: ${report.periodStart} - ${report.periodEnd}`, pageWidth / 2, 32, { align: "center" });
      
      doc.setTextColor(0);
      let y = 50;
      doc.text(`ДДС Продажби: ${Number(report.salesVAT).toFixed(2)} €`, 20, y);
      y += 10;
      doc.text(`ДДС Покупки: ${Number(report.purchasesVAT).toFixed(2)} €`, 20, y);
      y += 10;
      doc.text(`ДДС за внасяне: ${Number(report.payableVAT).toFixed(2)} €`, 20, y);
      
      doc.save(`DDS_${companyName.replace(/\s+/g, '_')}_${report.periodStart}.pdf`);
    }
  }

  private static getReportTitle(type: string): string {
    const titles: any = {
      balance: "Баланс",
      pnl: "Отчет за приходи и разходи",
      cashflow: "Отчет за паричните потоци",
    };
    return titles[type] || type;
  }

  private static addBalanceToPDF(doc: jsPDF, data: any, startY: number): number {
    const body: any[] = [];
    ['assets', 'liabilities', 'equity'].forEach(cat => {
      if (data[cat]) {
        Object.values(data[cat]).forEach((arr: any) => {
          arr.forEach((item: any) => {
             body.push([cat.toUpperCase(), item.accountCode || '-', item.accountName || '-', Number(item.balance || 0).toFixed(2)]);
          });
        });
      }
    });

    (doc as any).autoTable({
      startY: startY,
      head: [['Група', 'Код', 'Сметка', 'Сума']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  private static addPnLToPDF(doc: jsPDF, data: any, startY: number): number {
    const body: any[] = [];
    if (data.revenue?.breakdown) {
      data.revenue.breakdown.forEach((item: any) => {
        body.push(['ПРИХОДИ', item.accountCode || '-', item.accountName || '-', Number(item.amount || 0).toFixed(2)]);
      });
    }
    if (data.expenses?.breakdown) {
      data.expenses.breakdown.forEach((item: any) => {
        body.push(['РАЗХОДИ', item.accountCode || '-', item.accountName || '-', Number(item.amount || 0).toFixed(2)]);
      });
    }

    (doc as any).autoTable({
      startY: startY,
      head: [['Група', 'Код', 'Сметка', 'Сума']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    return (doc as any).lastAutoTable.finalY;
  }

  // Helper методи за форматиране
  private static formatCategoryForExcel(categoryData: any, categoryName: string) {
    const result: any[] = [];
    if (categoryData) {
      Object.values(categoryData).forEach((arr: any) => {
        arr.forEach((item: any) => {
          result.push({ Група: categoryName, Код: item.accountCode, Име: item.accountName, Сума: item.balance });
        });
      });
    }
    return result;
  }

  private static formatPnLForExcel(data: any) {
    const result: any[] = [];
    if (data.revenue?.breakdown) {
      data.revenue.breakdown.forEach((item: any) => {
        result.push({ Група: 'ПРИХОДИ', Код: item.accountCode, Име: item.accountName, Сума: item.amount });
      });
    }
    if (data.expenses?.breakdown) {
      data.expenses.breakdown.forEach((item: any) => {
        result.push({ Група: 'РАЗХОДИ', Код: item.accountCode, Име: item.accountName, Сума: item.amount });
      });
    }
    return result;
  }

  private static createMetadataSheet(period: string) {
    return null; // Not needed with the new exceljs flow
  }
}

