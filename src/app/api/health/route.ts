import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

interface ServiceStatus {
    status: 'operational' | 'degraded' | 'down';
    latency: number; // ms
    details?: string;
}

export async function GET() {
    const results: Record<string, ServiceStatus> = {};

    // 1. Backend — always operational if this route runs
    results.backend = { status: 'operational', latency: 0, details: 'Next.js server running' };

    // 2. Database (Supabase / PostgreSQL)
    const dbStart = Date.now();
    try {
        const { error } = await supabase
            .from('repositories')
            .select('id')
            .limit(1);
        const latency = Date.now() - dbStart;
        if (error) {
            results.database = { status: 'degraded', latency, details: error.message };
        } else {
            results.database = { status: 'operational', latency, details: 'Supabase PostgreSQL connected' };
        }
    } catch (err: unknown) {
        results.database = {
            status: 'down',
            latency: Date.now() - dbStart,
            details: err instanceof Error ? err.message : 'Connection failed',
        };
    }

    // 3. LLM (Gemini)
    const llmStart = Date.now();
    try {
        const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });
        const res = await genai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: 'health check',
            config: { taskType: 'RETRIEVAL_QUERY' },
        });
        const latency = Date.now() - llmStart;
        const hasVectors = (res.embeddings?.[0]?.values?.length ?? 0) > 0;
        results.llm = {
            status: hasVectors ? 'operational' : 'degraded',
            latency,
            details: hasVectors ? 'Gemini API responding' : 'Empty embedding returned',
        };
    } catch (err: unknown) {
        results.llm = {
            status: 'down',
            latency: Date.now() - llmStart,
            details: err instanceof Error ? err.message : 'Connection failed',
        };
    }

    const allOperational = Object.values(results).every(s => s.status === 'operational');
    const anyDown = Object.values(results).some(s => s.status === 'down');

    return NextResponse.json({
        overall: anyDown ? 'down' : allOperational ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        services: results,
    });
}
