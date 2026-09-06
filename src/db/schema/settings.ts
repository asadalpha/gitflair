import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { workspace } from "./workspaces";

// ── User Settings ──
// Key-value settings scoped to a user.

export const setting = pgTable(
  "setting",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("setting_user_id_key_idx").on(table.userId, table.key),
  ],
);

// ── User API Keys ──
// Stores LLM provider API keys per user.

export const userApiKey = pgTable(
  "user_api_key",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["openai", "anthropic", "google", "openrouter", "custom"],
    }).notNull(),
    label: text("label").notNull(),
    keyPrefix: text("key_prefix"), // First few chars for identification
    encryptedKey: text("encrypted_key").notNull(),
    isActive: text("is_active").default("true"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_api_key_user_id_idx").on(table.userId),
  ],
);

export const settingRelations = relations(setting, ({ one }) => ({
  user: one(user, {
    fields: [setting.userId],
    references: [user.id],
  }),
}));

export const userApiKeyRelations = relations(userApiKey, ({ one }) => ({
  user: one(user, {
    fields: [userApiKey.userId],
    references: [user.id],
  }),
}));
