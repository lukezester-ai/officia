// Този модул помага на Drizzle ORM да подава правилния контекст към Supabase RLS
// при използване на Server Actions / API Routes

import { sql } from 'drizzle-orm';

export async function setRLSContext(
  dbInstance: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  tenantId: string,
  userId: string,
  role: string,
) {
  await dbInstance.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
  await dbInstance.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
  await dbInstance.execute(sql`SELECT set_config('app.current_user_role', ${role}, true)`);
}
