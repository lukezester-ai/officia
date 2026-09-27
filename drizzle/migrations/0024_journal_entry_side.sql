DO $$ BEGIN
  CREATE TYPE journal_entry_side AS ENUM ('debit', 'credit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE journal_lines
  ALTER COLUMN entry_type TYPE journal_entry_side
  USING (
    CASE entry_type::text
      WHEN 'debit' THEN 'debit'::journal_entry_side
      WHEN 'credit' THEN 'credit'::journal_entry_side
      ELSE NULL
    END
  );
