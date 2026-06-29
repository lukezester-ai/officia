import { NextRequest } from 'next/server';
import { TaxEngine } from '@/lib/accounting/tax-engine';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const declarationId = searchParams.get('id');

    if (!declarationId) {
      return new Response('Missing declaration ID', { status: 400 });
    }

    const [declaration] = await db
      .select()
      .from(taxDeclarations)
      .where(eq(taxDeclarations.id, declarationId))
      .limit(1);

    if (!declaration || declaration.tenantId !== auth.tenantId) {
      return new Response('Declaration not found', { status: 404 });
    }

    const xml = await TaxEngine.generateDDSXml(declarationId);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="DDS_${declarationId.substring(0, 8)}.xml"`,
      },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
