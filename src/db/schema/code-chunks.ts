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
    // New embedding space; the legacy 384-dimension column is retained during migration.
    embedding: vector("embedding_v2", { dimensions: 1024 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("code_chunk_repository_id_idx").on(table.repositoryId),
    index("code_chunk_file_path_idx").on(table.filePath),

    // ⚡ Bolt Optimization: Added HNSW index for vector_cosine_ops.
    // Why: Prevents full sequential scans during semantic search in pgvector.
    // Impact: Reduces vector search time complexity from O(N) to O(log N).
    index("code_chunk_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const codeChunkRelations = relations(codeChunk, ({ one }) => ({
  repository: one(repository, {
    fields: [codeChunk.repositoryId],
    references: [repository.id],
  }),
}));
