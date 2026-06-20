// @ts-nocheck
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export class ReportExporter {

  // ==================== EXCEL ====================
  static exportToExcel(data: any, reportType: string, period: string) {
    const wb = XLSX.utils.book_new();

    if (reportType === 'balance') {
      // Create separate sheets for Assets, Liabilities, Equity and Summary
      const summaryData = [
        ["Баланс - Обобщение", ""],
        ["Период", period],
        ["", ""],
        ["Общо Активи", data.totalAssets],
        ["Общо Пасиви", data.totalLiabilities],
        ["Общо Капитал", data.totalEquity],
        ["Общо Пасиви и Капитал", data.totalLiabilitiesAndEquity],
        ["Балансиран", Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 1 ? "Да" : "Не"]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

      const wsAssets = XLSX.utils.json_to_sheet(this.formatCategoryForExcel(data.assets, 'Активи'));
      XLSX.utils.book_append_sheet(wb, wsAssets, "Assets");

      const wsLiabilities = XLSX.utils.json_to_sheet(this.formatCategoryForExcel(data.liabilities, 'Пасиви'));
      XLSX.utils.book_append_sheet(wb, wsLiabilities, "Liabilities");

      const wsEquity = XLSX.utils.json_to_sheet(this.formatCategoryForExcel(data.equity, 'Капитал'));
      XLSX.utils.book_append_sheet(wb, wsEquity, "Equity");

    } else if (reportType === 'pnl') {
      const summaryData = [
        ["P&L - Обобщение", ""],
        ["Период", period],
        ["", ""],
        ["Общо Приходи", data.revenue?.total || 0],
        ["Общо Разходи", data.expenses?.total || 0],
        ["Нетен Резултат", data.netProfit || 0],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

      const wsPnL = XLSX.utils.json_to_sheet(this.formatPnLForExcel(data));
      XLSX.utils.book_append_sheet(wb, wsPnL, "P&L Details");
    }

    XLSX.utils.book_append_sheet(wb, this.createMetadataSheet(period), "Информация");

    XLSX.writeFile(wb, `${reportType}_${period}.xlsx`);
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
    doc.text(`Общо Активи: ${data.totalAssets.toFixed(2)} лв`, 20, y);
    y += 7;
    doc.text(`Общо Пасиви и Капитал: ${data.totalLiabilitiesAndEquity.toFixed(2)} лв`, 20, y);
    y += 12;

    // Assets Table
    doc.setFontSize(13);
    doc.text("АКТИВИ", 20, y);
    y += 8;

    const assetsTable = this.prepareTableData(data.assets);
    (doc as any).autoTable({
      startY: y,
      head: [['Код', 'Наименование', 'Сума (лв)']],
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
      head: [['Код', 'Наименование', 'Сума (лв)']],
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
    return XLSX.utils.aoa_to_sheet([
      ["Officia ERP - Финансов Отчет"],
      ["Генериран на:", new Date().toLocaleDateString('bg-BG')],
      ["Час:", new Date().toLocaleTimeString('bg-BG')],
      ["Период:", period]
    ]);
  }
}
