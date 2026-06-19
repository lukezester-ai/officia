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
  static exportToPDF(data: any, reportType: string, period: string, companyName: string) {
    const doc = new jsPDF({
      orientation: reportType === 'balance' ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // Custom Header with Logo Placeholder (Dark Slate color)
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(companyName, 14, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ФИНАНСОВ ОТЧЕТ", pageWidth - 14, 20, { align: "right" });
    doc.text(this.getReportTitle(reportType).toUpperCase(), pageWidth - 14, 26, { align: "right" });

    // Reset text color for body
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Период: ${period}`, 14, 55);

    // Content
    let finalY = 65;
    if (reportType === 'balance') {
      finalY = this.addBalanceToPDF(doc, data, finalY);
    } else if (reportType === 'pnl') {
      finalY = this.addPnLToPDF(doc, data, finalY);
    }

    // Signatures
    const sigY = finalY + 40;
    if (sigY < 270) {
      doc.setFontSize(10);
      doc.text("Съставил: .......................................", 14, sigY);
      doc.text("Управител: .......................................", pageWidth - 80, sigY);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Генерирано чрез Officia ERP на: ${new Date().toLocaleDateString('bg-BG')} ${new Date().toLocaleTimeString('bg-BG')}`, pageWidth / 2, 290, { align: "center" });

    doc.save(`${reportType}_${period}.pdf`);
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
