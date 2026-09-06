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
import { repository } from "./repositories";

// ── Q&A History ──
// Stores user questions and AI answers for conversation history.

export const qaHistory = pgTable(
  "qa_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    referencesJson: jsonb("references_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("qa_history_user_id_idx").on(table.userId),
    index("qa_history_repository_id_idx").on(table.repositoryId),
  ],
);

export const qaHistoryRelations = relations(qaHistory, ({ one }) => ({
  user: one(user, {
    fields: [qaHistory.userId],
    references: [user.id],
  }),
  repository: one(repository, {
    fields: [qaHistory.repositoryId],
    references: [repository.id],
  }),
}));
