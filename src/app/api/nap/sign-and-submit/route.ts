// @ts-nocheck
import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and } from 'drizzle-orm';
import { cloudKepClient } from '@/lib/accounting/evrotrust-client';
import { napB2GClient } from '@/lib/accounting/nap-b2g-client';

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Неоторизиран достъп' }, { status: 401 });
    }

    const { period, type } = await req.json(); // e.g. period: "2026-07", type: "vat"
    
    if (type !== 'vat') {
      return NextResponse.json({ success: false, error: 'Поддържа се само VAT' }, { status: 400 });
    }

    const [yearStr, monthStr] = period.split('-');
    const periodYear = parseInt(yearStr);
    const periodMonth = parseInt(monthStr);

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error('Фирмата не е намерена');

    // 1. Generate XML Content (Simulation)
    // В реална среда тук се извиква generateVatXml(tenantId, periodYear, periodMonth)
    const xmlContentBase64 = Buffer.from(`<VatDeclaration><Period>${period}</Period></VatDeclaration>`).toString('base64');

    // 2. Изпращане за Cloud KEP Подпис към телефона на управителя
    const kepResponse = await cloudKepClient.sendDocumentForSignature(
      xmlContentBase64,
      tenant.phone || '0888000000',
      `ДДС Декларация ${period}`
    );

    if (!kepResponse.success) {
      throw new Error('Грешка при комуникация с Evrotrust');
    }

    // 3. Симулация на изчакване (Потребителят натиска "Подпиши" на телефона)
    // В реална среда UI-ът ще poll-ва статуса, но тук симулираме синхронно за демото
    await new Promise(resolve => setTimeout(resolve, 2500));
    const signedStatus = await cloudKepClient.checkSignatureStatus(kepResponse.transactionId);

    if (signedStatus.status !== 'signed' || !signedStatus.signedDocumentBase64) {
      throw new Error('Документът не беше подписан от управителя.');
    }

    // 4. Подаване на подписания XML директно към НАП
    const napResponse = await napB2GClient.submitVatDeclaration(
      tenant.eik || '123456789',
      signedStatus.signedDocumentBase64
    );

    if (!napResponse.success) {
      throw new Error('Отказ от НАП: ' + napResponse.error);
    }

    // 5. Записване на успеха в базата (tax_declarations)
    const startDate = new Date(periodYear, periodMonth - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(periodYear, periodMonth, 0).toISOString().split('T')[0];

    // Проверяваме дали вече имаме чернова/запис
    const [existing] = await db.select().from(taxDeclarations).where(
      and(
        eq(taxDeclarations.tenantId, tenantId),
        eq(taxDeclarations.periodStart, startDate),
        eq(taxDeclarations.type, 'dds')
      )
    );

    if (existing) {
      await db.update(taxDeclarations).set({
        status: 'submitted',
        submittedAt: new Date(),
        receiptNumber: napResponse.napReceiptNumber,
      }).where(eq(taxDeclarations.id, existing.id));
    } else {
      await db.insert(taxDeclarations).values({
        tenantId,
        type: 'dds',
        periodStart: startDate,
        periodEnd: endDate,
        status: 'submitted',
        data: { generatedFrom: 'b2g_direct' },
        submittedAt: new Date(),
        receiptNumber: napResponse.napReceiptNumber,
      });
    }

    return NextResponse.json({
      success: true,
      receiptNumber: napResponse.napReceiptNumber,
      message: 'Декларацията е подписана и подадена успешно в НАП!'
    });

  } catch (error: any) {
    console.error('[Sign and Submit NAP Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
