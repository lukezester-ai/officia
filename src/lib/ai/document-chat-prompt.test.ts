import { buildDocumentChatPrompt } from '@/lib/ai/document-chat-prompt';

describe('document chat prompt', () => {
  it('refuses to build a prompt when the file has no text', () => {
    expect(buildDocumentChatPrompt({ documentName: 'scan.jpg', extractedText: '  ' })).toBeNull();
  });

  it('includes only the extracted fields and text', () => {
    const prompt = buildDocumentChatPrompt({
      documentName: 'фактура.jpg',
      extractedText: 'Общо 120.00 EUR',
      fields: { totalAmount: 120, currency: 'EUR', date: '2026-01-15' },
    });
    expect(prompt).toContain('Общо 120.00 EUR');
    expect(prompt).toContain('Сума: 120 EUR');
    expect(prompt).toContain('Не измисляй числа');
  });
});
