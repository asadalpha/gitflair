import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn(
    "⚠️ [DATABASE] DATABASE_URL is not defined in environment variables (.env.local). Database queries will fail until set.",
  );
}

const sql = neon(
  databaseUrl ||
    "postgres://unconfigured:unconfigured@localhost:5432/unconfigured",
);
export const db = drizzle(sql, { schema });

export type DbInstance = typeof db;
