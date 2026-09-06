import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { repository } from "./repositories";

// ── PR Review ──
// Stores AI-generated pull request reviews.

export const prReview = pgTable(
  "pr_review",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    prNumber: integer("pr_number").notNull(),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["pending", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    summary: text("summary"),
    score: integer("score"),
    fileReviews: jsonb("file_reviews"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pr_review_repository_id_idx").on(table.repositoryId),
    index("pr_review_user_id_idx").on(table.userId),
    index("pr_review_pr_number_idx").on(table.prNumber),
  ],
);

export const prReviewRelations = relations(prReview, ({ one }) => ({
  repository: one(repository, {
    fields: [prReview.repositoryId],
    references: [repository.id],
  }),
  user: one(user, {
    fields: [prReview.userId],
    references: [user.id],
  }),
}));
