import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export class ReportExporter {

  // ==================== EXCEL ====================
  static exportToExcel(data: any, reportType: string, period: string) {
    const wb = XLSX.utils.book_new();

    if (reportType === 'balance') {
      const ws = XLSX.utils.json_to_sheet(this.formatBalanceForExcel(data));
      XLSX.utils.book_append_sheet(wb, ws, "Баланс");
    } else if (reportType === 'pnl') {
      const ws = XLSX.utils.json_to_sheet(this.formatPnLForExcel(data));
      XLSX.utils.book_append_sheet(wb, ws, "P&L");
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

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(companyName, 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text(this.getReportTitle(reportType), 105, 30, { align: "center" });
    doc.text(`Период: ${period}`, 105, 38, { align: "center" });

    // Content
    if (reportType === 'balance') {
      this.addBalanceToPDF(doc, data);
    } else if (reportType === 'pnl') {
      this.addPnLToPDF(doc, data);
    }

    // Footer
    doc.setFontSize(10);
    doc.text(`Генерирано на: ${new Date().toLocaleDateString('bg-BG')}`, 105, 290, { align: "center" });

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

  private static addBalanceToPDF(doc: jsPDF, data: any) {
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
      startY: 45,
      head: [['Група', 'Код', 'Сметка', 'Сума']],
      body: body,
      theme: 'grid'
    });
  }

  private static addPnLToPDF(doc: jsPDF, data: any) {
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
      startY: 45,
      head: [['Група', 'Код', 'Сметка', 'Сума']],
      body: body,
      theme: 'grid'
    });
  }

  // Helper методи за форматиране
  private static formatBalanceForExcel(data: any) {
    const result: any[] = [];
    ['assets', 'liabilities', 'equity'].forEach(cat => {
      if (data[cat]) {
        Object.values(data[cat]).forEach((arr: any) => {
          arr.forEach((item: any) => {
            result.push({ Група: cat.toUpperCase(), Код: item.accountCode, Име: item.accountName, Сума: item.balance });
          });
        });
      }
    });
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
      ["Отчет"],
      ["Генериран на:", new Date().toLocaleDateString('bg-BG')],
      ["Период:", period]
    ]);
  }
}
