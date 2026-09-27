import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users, tenants, tenantInvites } from '@/lib/db/schema';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { isPlanId, rulesFor, trialEndsFrom } from '@/lib/billing/entitlements';

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
    const normalizedEmail = email.trim().toLowerCase();
    const [invite] = await db.select().from(tenantInvites).where(eq(tenantInvites.email, normalizedEmail)).limit(1);

    let tenantId = invite?.tenantId;
    if (invite) {
      const seats = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, invite.tenantId));
      const pending = await db.select({ id: tenantInvites.id }).from(tenantInvites).where(eq(tenantInvites.tenantId, invite.tenantId));
      const occupied = seats.length + pending.filter((row) => row.id !== invite.id).length;
      const [company] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1);
      const plan = isPlanId(company?.plan) ? company.plan : 'starter';
      const cap = rulesFor(plan).limits.users;
      if (cap != null && occupied >= cap) {
        return new Response('OK', { status: 200 });
      }
      await db.delete(tenantInvites).where(eq(tenantInvites.id, invite.id));
    } else {
      const [newTenant] = await db.insert(tenants).values({
        name: `${first_name || ''} ${last_name || ''} - фирма`.trim() || 'Нова Фирма',
        plan: 'starter',
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndsFrom(new Date()),
      }).returning();
      tenantId = newTenant.id;
    }

    if (!tenantId) return new Response('OK', { status: 200 });

    await db.insert(users).values({
      clerkId: id,
      email,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      tenantId,
    }).returning();

    const client = await clerkClient();
    await client.users.updateUser(id, {
      publicMetadata: { tenantId },
    });
  }

  return new Response('OK', { status: 200 });
}
