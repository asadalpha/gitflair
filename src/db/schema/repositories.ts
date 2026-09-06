import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { workspace } from "./workspaces";

// ── Repository ──
// Tracks connected GitHub repositories per workspace.

export const repository = pgTable(
  "repository",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    githubId: integer("github_id"),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    owner: text("owner").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    defaultBranch: text("default_branch").default("main"),
    isPrivate: text("is_private"),
    language: text("language"),
    languagesJson: jsonb("languages_json"),
    topics: text("topics").array(),
    stars: integer("stars").default(0),
    forks: integer("forks").default(0),
    openIssues: integer("open_issues").default(0),
    analysisJson: jsonb("analysis_json"),
    addedById: text("added_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("repository_workspace_id_idx").on(table.workspaceId),
    index("repository_full_name_idx").on(table.fullName),
    index("repository_owner_idx").on(table.owner),
  ],
);

// ── Repository Sync ──
// Tracks sync status for each repository (indexing, analysis).

export const repositorySync = pgTable(
  "repository_sync",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "syncing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    syncType: text("sync_type", {
      enum: ["full", "incremental"],
    })
      .notNull()
      .default("full"),
    message: text("message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("repository_sync_repo_id_idx").on(table.repositoryId),
    index("repository_sync_status_idx").on(table.status),
  ],
);

// ── Relations ──

export const repositoryRelations = relations(repository, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [repository.workspaceId],
    references: [workspace.id],
  }),
  addedBy: one(user, {
    fields: [repository.addedById],
    references: [user.id],
  }),
  syncs: many(repositorySync),
}));

export const repositorySyncRelations = relations(repositorySync, ({ one }) => ({
  repository: one(repository, {
    fields: [repositorySync.repositoryId],
    references: [repository.id],
  }),
}));
