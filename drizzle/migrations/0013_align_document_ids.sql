-- Align invoice / purchase / bank / e-invoice IDs to UUID
-- and attach journal immutability trigger to journal_headers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop FKs that point at invoices.id / purchase_invoices.id before type changes.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, rel.relname AS table_name
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND (
        (rel.relname = 'invoice_lines' AND a.attname = 'invoice_id')
        OR (rel.relname = 'bank_transactions' AND a.attname = 'matched_invoice_id')
        OR (rel.relname = 'e_invoice_status' AND a.attname = 'invoice_id')
        OR (rel.relname = 'purchase_invoice_lines' AND a.attname = 'invoice_id')
      )
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.conname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- invoices.id: serial/int -> uuid
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  invoices_type text;
BEGIN
  SELECT c.data_type INTO invoices_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'invoices' AND c.column_name = 'id';

  IF invoices_type IN ('integer', 'bigint', 'smallint') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE invoices SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoice_lines' AND column_name = 'invoice_id'
    ) THEN
      ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS invoice_id_uuid uuid;
      UPDATE invoice_lines il
      SET invoice_id_uuid = i.id_uuid
      FROM invoices i
      WHERE i.id = il.invoice_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'matched_invoice_id'
    ) THEN
      ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS matched_invoice_id_uuid uuid;
      UPDATE bank_transactions bt
      SET matched_invoice_id_uuid = i.id_uuid
      FROM invoices i
      WHERE i.id = bt.matched_invoice_id;
    END IF;

    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
    ALTER TABLE invoices DROP COLUMN id;
    ALTER TABLE invoices RENAME COLUMN id_uuid TO id;
    ALTER TABLE invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE invoices ALTER COLUMN id SET NOT NULL;
    ALTER TABLE invoices ADD PRIMARY KEY (id);
  END IF;
END $$;

-- invoice_lines.invoice_id -> uuid (if still integer or leftover _uuid column)
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT c.data_type INTO col_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'invoice_lines' AND c.column_name = 'invoice_id';

  IF col_type IN ('integer', 'bigint', 'smallint') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoice_lines' AND column_name = 'invoice_id_uuid'
    ) THEN
      ALTER TABLE invoice_lines DROP COLUMN invoice_id;
      ALTER TABLE invoice_lines RENAME COLUMN invoice_id_uuid TO invoice_id;
    ELSE
      ALTER TABLE invoice_lines ALTER COLUMN invoice_id TYPE uuid USING NULL;
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoice_lines' AND column_name = 'invoice_id_uuid'
  ) THEN
    ALTER TABLE invoice_lines DROP COLUMN IF EXISTS invoice_id;
    ALTER TABLE invoice_lines RENAME COLUMN invoice_id_uuid TO invoice_id;
  END IF;
END $$;

-- invoice_lines.id serial -> uuid
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT c.data_type INTO col_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'invoice_lines' AND c.column_name = 'id';

  IF col_type IN ('integer', 'bigint', 'smallint') THEN
    ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE invoice_lines SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
    ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_pkey;
    ALTER TABLE invoice_lines DROP COLUMN id;
    ALTER TABLE invoice_lines RENAME COLUMN id_uuid TO id;
    ALTER TABLE invoice_lines ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE invoice_lines ALTER COLUMN id SET NOT NULL;
    ALTER TABLE invoice_lines ADD PRIMARY KEY (id);
  END IF;
END $$;

-- bank_transactions.matched_invoice_id -> uuid
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT c.data_type INTO col_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'matched_invoice_id';

  IF col_type IN ('integer', 'bigint', 'smallint') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'matched_invoice_id_uuid'
    ) THEN
      ALTER TABLE bank_transactions DROP COLUMN matched_invoice_id;
      ALTER TABLE bank_transactions RENAME COLUMN matched_invoice_id_uuid TO matched_invoice_id;
    ELSE
      ALTER TABLE bank_transactions ALTER COLUMN matched_invoice_id TYPE uuid USING NULL;
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'matched_invoice_id_uuid'
  ) THEN
    ALTER TABLE bank_transactions DROP COLUMN IF EXISTS matched_invoice_id;
    ALTER TABLE bank_transactions RENAME COLUMN matched_invoice_id_uuid TO matched_invoice_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- purchase_invoices: text ids / tenant_id -> uuid
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  id_type text;
  tenant_type text;
BEGIN
  SELECT c.data_type INTO id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'purchase_invoices' AND c.column_name = 'id';

  SELECT c.data_type INTO tenant_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'purchase_invoices' AND c.column_name = 'tenant_id';

  IF id_type IN ('text', 'character varying') THEN
    ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE purchase_invoices
    SET id_uuid = CASE
      WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
      ELSE gen_random_uuid()
    END
    WHERE id_uuid IS NULL OR id_uuid IS DISTINCT FROM (
      CASE
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
        ELSE id_uuid
      END
    );

    UPDATE purchase_invoices
    SET id_uuid = CASE
      WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid
      ELSE COALESCE(id_uuid, gen_random_uuid())
    END;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_invoice_lines' AND column_name = 'invoice_id'
    ) THEN
      ALTER TABLE purchase_invoice_lines ADD COLUMN IF NOT EXISTS invoice_id_uuid uuid;
      UPDATE purchase_invoice_lines pl
      SET invoice_id_uuid = p.id_uuid
      FROM purchase_invoices p
      WHERE p.id = pl.invoice_id;
    END IF;

    ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_pkey;
    ALTER TABLE purchase_invoices DROP COLUMN id;
    ALTER TABLE purchase_invoices RENAME COLUMN id_uuid TO id;
    ALTER TABLE purchase_invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE purchase_invoices ALTER COLUMN id SET NOT NULL;
    ALTER TABLE purchase_invoices ADD PRIMARY KEY (id);
  END IF;

  IF tenant_type IN ('text', 'character varying') THEN
    ALTER TABLE purchase_invoices
      ALTER COLUMN tenant_id TYPE uuid
      USING CASE
        WHEN tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN tenant_id::uuid
        ELSE NULL
      END;
  END IF;
END $$;

DO $$
DECLARE
  col_type text;
  id_type text;
BEGIN
  SELECT c.data_type INTO col_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'purchase_invoice_lines' AND c.column_name = 'invoice_id';

  IF col_type IN ('text', 'character varying') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_invoice_lines' AND column_name = 'invoice_id_uuid'
    ) THEN
      ALTER TABLE purchase_invoice_lines DROP COLUMN invoice_id;
      ALTER TABLE purchase_invoice_lines RENAME COLUMN invoice_id_uuid TO invoice_id;
    ELSE
      ALTER TABLE purchase_invoice_lines
        ALTER COLUMN invoice_id TYPE uuid
        USING CASE
          WHEN invoice_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN invoice_id::uuid
          ELSE NULL
        END;
    END IF;
  END IF;

  SELECT c.data_type INTO id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'purchase_invoice_lines' AND c.column_name = 'id';

  IF id_type IN ('text', 'character varying', 'integer', 'bigint', 'smallint') THEN
    ALTER TABLE purchase_invoice_lines ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE purchase_invoice_lines SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
    ALTER TABLE purchase_invoice_lines DROP CONSTRAINT IF EXISTS purchase_invoice_lines_pkey;
    ALTER TABLE purchase_invoice_lines DROP COLUMN id;
    ALTER TABLE purchase_invoice_lines RENAME COLUMN id_uuid TO id;
    ALTER TABLE purchase_invoice_lines ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE purchase_invoice_lines ALTER COLUMN id SET NOT NULL;
    ALTER TABLE purchase_invoice_lines ADD PRIMARY KEY (id);
  END IF;
END $$;

-- journal_headers.reversed_from_id
ALTER TABLE journal_headers ADD COLUMN IF NOT EXISTS reversed_from_id uuid;

-- Clear broken user/tenant refs before adding FKs
UPDATE invoices i
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = i.user_id);

UPDATE invoices i
SET tenant_id = NULL
WHERE tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id);

UPDATE e_invoice_status eis
SET invoice_id = invoice_id
WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.id = eis.invoice_id);

DELETE FROM e_invoice_status eis
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = eis.invoice_id);

-- Recreate FKs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_lines')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoice_lines
      ADD CONSTRAINT invoice_lines_invoice_id_invoices_id_fk
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bank_transactions
    ADD CONSTRAINT bank_transactions_matched_invoice_id_invoices_id_fk
    FOREIGN KEY (matched_invoice_id) REFERENCES invoices(id);
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_column THEN NULL;
WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  -- Drop orphan e-invoice rows that cannot match a UUID invoice
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'e_invoice_status') THEN
    DELETE FROM e_invoice_status eis
    WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = eis.invoice_id);
    ALTER TABLE e_invoice_status
      ADD CONSTRAINT e_invoice_status_invoice_id_invoices_id_fk
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE purchase_invoice_lines
    ADD CONSTRAINT purchase_invoice_lines_invoice_id_fk
    FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_tenant_id_tenants_id_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE purchase_invoices
    ADD CONSTRAINT purchase_invoices_tenant_id_tenants_id_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Journal immutability trigger lives on journal_headers (not journal_entries)
CREATE OR REPLACE FUNCTION prevent_posted_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Недопустима операция според ЗСч: Публикувани счетоводни статии не могат да бъдат променяни или изтривани. Използвайте СТОРНО операция.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_immutable ON journal_entries;
DROP TRIGGER IF EXISTS trg_journal_immutable ON journal_headers;
CREATE TRIGGER trg_journal_immutable
BEFORE UPDATE OR DELETE ON journal_headers
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_mutation();
