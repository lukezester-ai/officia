import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users, tenants } from '@/lib/db/schema';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const payload = await req.json();
  const headersList = await headers();
  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: WebhookEvent;
  
  try {
    evt = wh.verify(JSON.stringify(payload), {
      'svix-id': svixId!,
      'svix-timestamp': svixTimestamp!,
      'svix-signature': svixSignature!,
    }) as WebhookEvent;
  } catch (err) {
    return new Response('Webhook verification failed', { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0].email_address;

    // Create a new Tenant (Company) for this user
    const [newTenant] = await db.insert(tenants).values({
      name: `${first_name || ''} ${last_name || ''} - фирма`.trim() || 'Нова Фирма',
    }).returning();

    // Create the User and link to the Tenant
    await db.insert(users).values({
      clerkId: id,
      email,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      tenantId: newTenant.id,
    }).returning();

    // Store the tenantId in Clerk's metadata so we can access it from the session
    const client = await clerkClient();
    await client.users.updateUser(id, {
      publicMetadata: { tenantId: newTenant.id },
    });
  }

  return new Response('OK', { status: 200 });
}
