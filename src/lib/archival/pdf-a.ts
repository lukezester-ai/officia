// @ts-nocheck
// В реална среда се инсталира съответната библиотека за PDF/A
// import { PdfDocument } from '@carbon/ibm-cloud-pdf';

// Mock за да не гърми TypeScript, докато не се инсталира конкретната библиотека
const PdfDocument = {
  load: async (buffer: Buffer) => ({
    convertToPdfA: (format: string) => {},
    save: async () => buffer,
  })
};

export async function convertToPdfA(documentBuffer: Buffer): Promise<Buffer> {
  // Конвертиране към PDF/A-3 формат
  const pdfDoc = await PdfDocument.load(documentBuffer);
  pdfDoc.convertToPdfA('PDF/A-3');
  return await pdfDoc.save();
}
