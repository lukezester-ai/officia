// Database Schema (Drizzle ORM) – nap-integrations.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations"; // existing organizations table

// Table for storing encrypted NAP API integrations per organization
export const napIntegrations = pgTable("nap_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Encrypted API key – never stored in plaintext
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptionIv: text("encryption_iv").notNull(), // AES‑GCM IV

  // Non‑sensitive metadata
  eik: text("eik").notNull(), // Company identifier
  connectedByUserId: text("connected_by_user_id").notNull(), // Clerk user id for audit
  status: text("status", { enum: ["active", "revoked", "error"] })
    .notNull()
    .default("active"),
  lastValidatedAt: timestamp("last_validated_at"),
  lastError: text("last_error"), // Last error message if call failed

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit log table – required for compliance (no sensitive payloads stored)
export const napAccessLog = pgTable("nap_access_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationId: uuid("integration_id")
    .notNull()
    .references(() => napIntegrations.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "connect", "revoke", "api_call", "validation_failed"
  metadata: jsonb("metadata"), // Additional context (endpoint, response code – never raw data)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
