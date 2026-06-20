import { NextRequest } from 'next/server';
import { TaxEngine } from '@/lib/accounting/tax-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const declarationId = searchParams.get('id');

    if (!declarationId) {
      return new Response("Missing declaration ID", { status: 400 });
    }

    const xml = await TaxEngine.generateDDSXml(declarationId);

    // Return the XML directly as a downloadable file
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
