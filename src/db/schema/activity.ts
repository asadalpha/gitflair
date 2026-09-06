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

// ── Activity Log ──
// Unified audit trail for user actions across the app.

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_log_workspace_id_idx").on(table.workspaceId),
    index("activity_log_user_id_idx").on(table.userId),
    index("activity_log_action_idx").on(table.action),
    index("activity_log_created_at_idx").on(table.createdAt),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  workspace: one(workspace, {
    fields: [activityLog.workspaceId],
    references: [workspace.id],
  }),
  user: one(user, {
    fields: [activityLog.userId],
    references: [user.id],
  }),
}));
