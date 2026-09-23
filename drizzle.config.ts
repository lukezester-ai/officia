// @ts-ignore
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default {
  schema: './src/lib/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: (() => {
      const migrate = process.env.DATABASE_MIGRATE_URL;
      const app = process.env.DATABASE_URL;
      if (process.env.OFFICIA_ENFORCE_APP_ROLE === '1') {
        if (!migrate) {
          throw new Error('DATABASE_MIGRATE_URL is required when OFFICIA_ENFORCE_APP_ROLE=1');
        }
        if (app && migrate === app) {
          throw new Error('DATABASE_MIGRATE_URL must differ from DATABASE_URL');
        }
      }
      return migrate || app!;
    })(),
  },
} as any;
