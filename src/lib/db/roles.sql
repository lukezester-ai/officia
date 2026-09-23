-- Officia DB roles: migration/admin ≠ table owner path vs application.
-- Run as a superuser or database owner. Idempotent.
-- FORCE ROW LEVEL SECURITY is intentionally NOT enabled here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_migrate') THEN
    CREATE ROLE officia_migrate LOGIN PASSWORD 'officia_migrate_change_me' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE officia_migrate NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
    CREATE ROLE officia_app LOGIN PASSWORD 'officia_app_change_me' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE officia_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

-- GRANT CONNECT ON DATABASE <db> TO officia_migrate, officia_app;

GRANT USAGE, CREATE ON SCHEMA public TO officia_migrate;
GRANT USAGE ON SCHEMA public TO officia_app;
REVOKE CREATE ON SCHEMA public FROM officia_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO officia_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO officia_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO officia_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO officia_migrate;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO officia_migrate;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO officia_migrate;

ALTER DEFAULT PRIVILEGES FOR ROLE officia_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO officia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE officia_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO officia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE officia_migrate IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO officia_app;
