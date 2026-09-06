import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { repository } from "./repositories";
import { user } from "./auth";

export const codeNotes = pgTable(
  "code_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repoId: uuid("repo_id").references(() => repository.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    category: text("category").notNull().default("logic"),
    assignee: text("assignee").notNull().default("Unassigned"),
    date: text("date").notNull().default("Today"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_code_notes_repo_id").on(table.repoId),
    index("idx_code_notes_user_id").on(table.userId),
  ]
);

export const codeNotesRelations = relations(codeNotes, ({ one }) => ({
  repository: one(repository, {
    fields: [codeNotes.repoId],
    references: [repository.id],
  }),
}));

export const codePages = pgTable(
  "code_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => repository.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled Page"),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_code_pages_user_id").on(table.userId),
    index("idx_code_pages_repo_id").on(table.repoId),
  ]
);

export const codePagesRelations = relations(codePages, ({ one }) => ({
  repository: one(repository, {
    fields: [codePages.repoId],
    references: [repository.id],
  }),
}));