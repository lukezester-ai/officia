import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    const { image } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'officia/logos',
      public_id: `tenant_${tenantId}`,
      overwrite: true,
    });

    await db
      .update(tenants)
      .set({ logoUrl: result.secure_url, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
