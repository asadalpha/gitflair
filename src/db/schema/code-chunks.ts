import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core/columns/vector_extension/vector";
import { repository } from "./repositories";

// ── Code Chunk ──
// Indexed code chunks with vector embeddings for semantic search.

export const codeChunk = pgTable(
  "code_chunk",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    content: text("content").notNull(),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    language: text("language").notNull(),
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("code_chunk_repository_id_idx").on(table.repositoryId),
    index("code_chunk_file_path_idx").on(table.filePath),
  ],
);

export const codeChunkRelations = relations(codeChunk, ({ one }) => ({
  repository: one(repository, {
    fields: [codeChunk.repositoryId],
    references: [repository.id],
  }),
}));
