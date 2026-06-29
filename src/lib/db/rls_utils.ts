// Този модул помага на Drizzle ORM да подава правилния контекст към Supabase RLS
// при използване на Server Actions / API Routes

import { sql } from 'drizzle-orm';
// import { db } from './db';

/**
 * Задава контекст на PostgreSQL сесията, така че RLS политиките да знаят кой е потребителят.
 * Това е алтернатива на Supabase JWT claims, когато правим сървърни заявки с Admin Role.
 */
export async function setRLSContext(dbInstance: any, tenantId: string, userId: string, role: string) {
  console.log(`Задаване на RLS контекст: Фирма ${tenantId}, Потребител ${userId}, Роля ${role}`);
  
  await dbInstance.execute(sql`
    SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE);
    SELECT set_config('app.current_user_id', ${userId}, TRUE);
    SELECT set_config('app.current_user_role', ${role}, TRUE);
  `);
}
