import { NextRequest } from "next/server";
import { db } from "@/db";
import { codeChunk, qaHistory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { requireAuth } from "@/lib/session";
import { embedQuery, chatWithContextStream } from "@/lib/gemini";

type RetrievedChunk = {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
};

const CHUNK_LIMIT = 5;

export async function POST(req: NextRequest) {
  try {
    const { question, repositoryId, userId: bodyUserId } = await req.json();
    const { user } = await requireAuth(req.headers, bodyUserId);

    if (!question || !repositoryId) {
      return Response.json(
        { error: "Question and repositoryId are required" },
        { status: 400 },
      );
    }

    const chatCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(qaHistory)
      .where(
        and(
          eq(qaHistory.repositoryId, repositoryId),
          eq(qaHistory.userId, user.id),
        ),
      );

    const chatCount = Number(chatCountResult[0]?.count ?? 0);
    if (chatCount >= 3) {
      return Response.json(
        { error: "Limit reached: You can only ask up to 3 questions per repository." },
        { status: 403 },
      );
    }

    const [anyChunk] = await db
      .select({ id: codeChunk.id })
      .from(codeChunk)
      .where(eq(codeChunk.repositoryId, repositoryId))
      .limit(1);

    if (!anyChunk) {
      return Response.json({
        answer:
          "No code chunks found for this repository. Please index the repository first before asking questions.",
        chunks: [],
      });
    }

    const chunks = await retrieveChunks(question, repositoryId);

    const context = chunks
      .map(
        (c) =>
          `File: ${c.filePath} (Lines ${c.startLine}-${c.endLine})\nContent:\n${c.content}`,
      )
      .join("\n\n---\n\n");

    const recentHistory = await db
      .select({
        question: qaHistory.question,
        answer: qaHistory.answer,
      })
      .from(qaHistory)
      .where(
        and(
          eq(qaHistory.repositoryId, repositoryId),
          eq(qaHistory.userId, user.id),
        ),
      )
      .orderBy(desc(qaHistory.createdAt))
      .limit(5);

    const chatHistory = (recentHistory ?? [])
      .reverse()
      .flatMap((h) => [
        { role: "user" as const, content: h.question },
        { role: "assistant" as const, content: h.answer },
      ]);

    const chunkDto = chunks.map((c) => ({
      file_path: c.filePath,
      start_line: c.startLine,
      end_line: c.endLine,
      language: c.language,
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        send({ type: "chunks", chunks: chunkDto });

        let fullAnswer = "";
        try {
          const gen = await chatWithContextStream(context, question, chatHistory);
          for await (const token of gen) {
            fullAnswer += token;
            send({ type: "token", text: token });
          }

          await db.insert(qaHistory).values({
            userId: user.id,
            repositoryId,
            question,
            answer: fullAnswer,
            referencesJson: chunks.map((c) => ({
              file_path: c.filePath,
              start_line: c.startLine,
              end_line: c.endLine,
            })),
          });

          send({ type: "done" });
        } catch (error: unknown) {
          send({
            type: "error",
            error: error instanceof Error ? error.message : "LLM call failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Ask Route Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

async function retrieveChunks(
  question: string,
  repositoryId: string,
): Promise<RetrievedChunk[]> {
  try {
    const queryEmbedding = await embedQuery(question);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error("Empty embedding");
    }

    const similarity = cosineDistance(codeChunk.embedding, queryEmbedding);
    const vectorResults = await db
      .select({
        filePath: codeChunk.filePath,
        content: codeChunk.content,
        startLine: codeChunk.startLine,
        endLine: codeChunk.endLine,
        language: codeChunk.language,
        distance: similarity,
      })
      .from(codeChunk)
      .where(
        and(
          eq(codeChunk.repositoryId, repositoryId),
          sql`${codeChunk.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(similarity)
      .limit(CHUNK_LIMIT);

    if (vectorResults.length > 0) {
      return vectorResults;
    }
  } catch (error) {
    console.error("[ASK] Vector search failed, falling back to keyword:", error);
  }

  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w: string) => w.length > 3);

  if (keywords.length > 0) {
    const conditions = keywords.map(
      (kw: string) => sql`LOWER(${codeChunk.content}) LIKE ${`%${kw}%`}`,
    );
    const keywordHits = await db
      .select({
        filePath: codeChunk.filePath,
        content: codeChunk.content,
        startLine: codeChunk.startLine,
        endLine: codeChunk.endLine,
        language: codeChunk.language,
      })
      .from(codeChunk)
      .where(
        and(
          eq(codeChunk.repositoryId, repositoryId),
          sql`(${sql.join(conditions, sql` OR `)})`,
        ),
      )
      .limit(CHUNK_LIMIT);

    if (keywordHits.length > 0) return keywordHits;
  }

  const recent = await db
    .select({
      filePath: codeChunk.filePath,
      content: codeChunk.content,
      startLine: codeChunk.startLine,
      endLine: codeChunk.endLine,
      language: codeChunk.language,
    })
    .from(codeChunk)
    .where(eq(codeChunk.repositoryId, repositoryId))
    .orderBy(desc(codeChunk.createdAt))
    .limit(CHUNK_LIMIT);

  return recent;
}