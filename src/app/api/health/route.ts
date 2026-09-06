import { NextResponse } from "next/server";
import { db } from "@/db";
import { repository } from "@/db/schema";
import { sql } from "drizzle-orm";
import { isQuotaExceeded } from "@/lib/gemini";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  status: "operational" | "degraded" | "down";
  latency: number;
  details?: string;
}

export async function GET() {
  const results: Record<string, ServiceStatus> = {};

  // 1. Backend — always operational if this route runs
  results.backend = {
    status: "operational",
    latency: 0,
    details: "Next.js server running",
  };

  // 2. Database (Neon PostgreSQL via Drizzle)
  const dbStart = Date.now();
  try {
    const [row] = await db
      .select({ id: repository.id })
      .from(repository)
      .limit(1);
    const latency = Date.now() - dbStart;
    const isDegraded = latency > 2000;
    results.database = {
      status: isDegraded ? "degraded" : "operational",
      latency,
      details: `Neon PostgreSQL connected${row ? "" : " (empty table)"}${isDegraded ? " (cold start latency)" : ""}`,
    };
  } catch (err: unknown) {
    results.database = {
      status: "down",
      latency: Date.now() - dbStart,
      details: err instanceof Error ? err.message : "Connection failed",
    };
  }

  // 3. LLM (Local Embedder)
  const llmStart = Date.now();
  try {
    const { embedQuery } = await import("@/lib/gemini");
    const vector = await embedQuery("health check");
    const latency = Date.now() - llmStart;
    const hasVectors = vector && vector.length === 384;
    results.llm = {
      status: hasVectors ? "operational" : "degraded",
      latency,
      details: hasVectors
        ? "Local Transformers.js embedder responding"
        : "Invalid embedding dimensions returned",
    };
  } catch (err: unknown) {
    results.llm = {
      status: "down",
      latency: Date.now() - llmStart,
      details: err instanceof Error ? err.message : "Local embedder load failed",
    };
  }

  const allOperational = Object.values(results).every(
    (s) => s.status === "operational",
  );
  const anyDown = Object.values(results).some((s) => s.status === "down");

  return NextResponse.json({
    overall: anyDown ? "down" : allOperational ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    services: results,
  });
}
