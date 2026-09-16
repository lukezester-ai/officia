export async function exportToExcel(_reportData: unknown, reportName: string): Promise<never> {
  throw new Error(`Excel експортът за „${reportName}“ не е имплементиран. Не се връща празен/фиктивен файл.`);
}

export async function exportToPDF(_reportData: unknown, reportName: string): Promise<never> {
  throw new Error(`PDF експортът за „${reportName}“ не е имплементиран. Не се връща фиктивен PDF.`);
}
