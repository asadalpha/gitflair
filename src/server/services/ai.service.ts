import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { randomUUID } from "node:crypto";

const EMBEDDING_DIMENSIONS = 1024;
const OPENROUTER_EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free";
const EMBEDDING_INPUT_CHAR_LIMIT = 1600;

/**
 * Deterministic 1024-dimensional fallback used only when OpenRouter embeddings
 * are unavailable. It keeps ingestion usable, but is not a replacement for
 * the semantic embedding model.
 */
function fallbackEmbed(text: string): number[] {
    const dim = EMBEDDING_DIMENSIONS;
    const vector = new Array(dim).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
        const idx = Math.abs(hash) % dim;
        vector[idx] += (i % 2 === 0 ? 1 : -1);
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map(v => v / norm);
}

/**
 * Check if the error is an AI API quota exceeded (rate limit) error.
 */
export function isQuotaExceeded(error: unknown): boolean {
    if (!error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    return (
        msg.includes("429") ||
        msg.toLowerCase().includes("quota exceeded") ||
        msg.toLowerCase().includes("rate limit")
    );
}

/**
 * Embed a single query string.
 * Returns a number[] vector (1024 dimensions) suitable for pgvector.
 */
export async function embedQuery(text: string): Promise<number[]> {
    try {
        const [embedding] = await requestOpenRouterEmbeddings([text]);
        return embedding;
    } catch (error) {
        console.warn("[EMBED] OpenRouter embedding failed, using normalized fallback:", error);
        return fallbackEmbed(text);
    }
}

/**
 * Embed multiple documents through OpenRouter.
 * Returns an array of number[] vectors, one per input string.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
    try {
        return await requestOpenRouterEmbeddings(texts);
    } catch (error) {
        console.warn("[EMBED] OpenRouter batch embedding failed, using normalized fallbacks:", error);
        return texts.map(t => fallbackEmbed(t));
    }
}

async function requestOpenRouterEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

    const input = texts.map((text) => text.slice(0, EMBEDDING_INPUT_CHAR_LIMIT));
    let response: Response | undefined;
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://gitflair.ai",
            "X-Title": "GitFlair",
        },
        body: JSON.stringify({
            model: process.env.OPENROUTER_EMBEDDING_MODEL || OPENROUTER_EMBEDDING_MODEL,
            input,
        }),
      });
      if (response.ok || (response.status !== 429 && response.status !== 503)) break;
      lastError = await response.text().catch(() => "");
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }

    if (!response || !response.ok) {
        const errText = response ? await response.text().catch(() => "") : "";
        throw new Error(`OpenRouter embeddings API error: ${response?.status ?? 503} ${errText || lastError}`);
    }

    const data = await response.json();
    const embeddings = (data.data || [])
        .sort((a: { index?: number }, b: { index?: number }) => (a.index ?? 0) - (b.index ?? 0))
        .map((item: { embedding?: number[] }) => item.embedding);

    if (embeddings.length !== texts.length || embeddings.some((v: number[] | undefined) => v?.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error(`Expected ${texts.length} embeddings with ${EMBEDDING_DIMENSIONS} dimensions`);
    }
    return embeddings as number[][];
}

/**
 * LLM routing: OpenRouter's free model first, then OpenCode Go if OpenRouter
 * is unavailable or returns an error. OpenCode Go deliberately does not
 * provide embeddings; OpenRouter handles embeddings above.
 */
export async function generateCompletion(prompt: string, jsonMode: boolean = false): Promise<string> {
    try {
        return await requestChatCompletion("openrouter", prompt, jsonMode);
    } catch (openRouterError) {
        console.warn("[LLM] OpenRouter failed; trying OpenCode Go:", openRouterError);
        return requestChatCompletion("opencode", prompt, jsonMode);
    }
}

type CompletionProvider = "openrouter" | "opencode";

async function requestChatCompletion(provider: CompletionProvider, prompt: string, jsonMode: boolean): Promise<string> {
    const apiKey = provider === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.OPENCODE_GO_API_KEY;
    if (!apiKey) throw new Error(`${provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENCODE_GO_API_KEY"} is not configured`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
        model: provider === "openrouter"
            ? (process.env.OPENROUTER_MODEL || "openrouter/free")
            : (process.env.OPENCODE_GO_MODEL || "glm-5.3-flash"),
        messages: [{ role: "user", content: prompt }],
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const baseUrl = provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : (process.env.OPENCODE_GO_BASE_URL || "https://opencode.ai/zen/go/v1");
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(provider === "openrouter"
                ? { "HTTP-Referer": "https://gitflair.ai", "X-Title": "GitFlair" }
                : { "User-Agent": "GitFlair/1.0", "x-opencode-session": randomUUID() }),
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`${provider} chat API error: ${response.status} ${errText}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text) throw new Error(`Empty response from ${provider}`);
    return text;
}

/**
 * Extract the first valid JSON object from an LLM response that may contain
 * markdown fences, prose, or safety prefixes (e.g. "User Safety: safe{...}").
 */
function extractJson(text: string): string {
    let cleaned = text.replace(/^```json\s*/i, "").replace(/```$/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    return cleaned;
}

export async function* generateCompletionStream(prompt: string, jsonMode: boolean = false): AsyncGenerator<string> {
    try {
        yield* streamChatCompletion("openrouter", prompt, jsonMode);
    } catch (openRouterError) {
        console.warn("[LLM] OpenRouter stream failed; trying OpenCode Go:", openRouterError);
        yield* streamChatCompletion("opencode", prompt, jsonMode);
    }
}

async function* streamChatCompletion(provider: CompletionProvider, prompt: string, jsonMode: boolean): AsyncGenerator<string> {
    const apiKey = provider === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.OPENCODE_GO_API_KEY;
    if (!apiKey) throw new Error(`${provider} API key is not configured`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
        model: provider === "openrouter" ? (process.env.OPENROUTER_MODEL || "openrouter/free") : (process.env.OPENCODE_GO_MODEL || "glm-5.3-flash"),
        messages: [{ role: "user", content: prompt }], stream: true,
    };
    if (jsonMode) body.response_format = { type: "json_object" };
    const baseUrl = provider === "openrouter" ? "https://openrouter.ai/api/v1" : (process.env.OPENCODE_GO_BASE_URL || "https://opencode.ai/zen/go/v1");
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...(provider === "openrouter" ? { "HTTP-Referer": "https://gitflair.ai", "X-Title": "GitFlair" } : { "User-Agent": "GitFlair/1.0", "x-opencode-session": randomUUID() }) },
        body: JSON.stringify(body),
    });
    if (!response.ok || !response.body) throw new Error(`${provider} stream API error: ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
            const trimmed = line.trim(); if (!trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6); if (payload === "[DONE]") return;
            try { const delta = JSON.parse(payload).choices?.[0]?.delta?.content; if (delta) yield delta; } catch { /* Ignore malformed SSE events. */ }
        }
    }
}
export async function chatWithContext(
    context: string,
    question: string,
    chatHistory?: { role: string; content: string }[]
): Promise<string> {
    const prompt = buildChatPrompt(context, question, chatHistory);
    const text = await generateCompletion(prompt);
    return text || "I could not find this in the indexed codebase.";
}

function buildChatPrompt(context: string, question: string, chatHistory?: { role: string; content: string }[]): string {
    const historyBlock = chatHistory && chatHistory.length > 0
        ? `\nRecent conversation history (for context, do NOT repeat previous answers):\n${chatHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')}\n`
        : '';

    return `You are a concise, helpful senior software engineer answering questions about a codebase in a chat. The UI renders full markdown.

RULES — follow these strictly:
1. STRICTLY FORBIDDEN: Do NOT include raw source code, code blocks, or file snippets in your response. The chat window must be completely clean and text-focused.
2. Explain code structure, logic, improvements, and answers conceptually and concisely.
3. Keep your answer to 1-3 short paragraphs. Be direct — no filler.
4. Reference file paths using backticks like \`src/lib/auth.ts\`.
5. If the user asks for code changes, explain the exact line references, logic edits, or functions to modify conceptually, but DO NOT provide code snippets.
6. If you can't answer from the snippets, say: "I couldn't find that in the indexed codebase."
7. Sound like a teammate — casual, knowledgeable, brief.
${historyBlock}
Context from the codebase:
${context}

User question: ${question}`;
}

export async function chatWithContextStream(
    context: string,
    question: string,
    chatHistory?: { role: string; content: string }[]
): Promise<AsyncGenerator<string>> {
    const prompt = buildChatPrompt(context, question, chatHistory);
    // Chat uses OpenCode Go directly. OpenRouter remains the primary/fallback
    // router for background analysis and PR review generation.
    return streamChatCompletion("opencode", prompt, false);
}

/**
 * Perform a high-level architectural analysis of the codebase.
 */
export async function analyzeRepository(
    filePaths: string[],
    topChunksContext: string
): Promise<{ summary: string; architecture: string; improvements: { title: string; desc: string; files: string[] }[] }> {
    const prompt = `You are a principal software architect. You are analyzing a codebase with the following file tree and sample code segments.
    
File paths in the repository:
${filePaths.slice(0, 100).map(f => `- ${f}`).join("\n")}

Sample code snippets for context:
${topChunksContext}

Perform a high-level architectural analysis of the codebase.
Provide your response in JSON format matching this schema:
{
  "summary": "1-2 sentence high-level summary of what this repository does.",
  "architecture": "A brief overview of the project architecture, naming patterns, key folders, and framework choice.",
  "improvements": [
    {
      "title": "Short title of improvement (e.g., Add Unit Testing, Refactor Auth Middleware)",
      "desc": "Actionable explanation of how and why this should be improved.",
      "files": ["list of relevant files or folder paths"]
    }
  ]
}

Ensure your response is valid JSON and contains only the JSON object. Do not include markdown code blocks.`;

    try {
        const text = await generateCompletion(prompt, true);
        return JSON.parse(extractJson(text));
    } catch (error) {
        console.error("Repository analysis failed:", error);
        return {
            summary: "Repository indexed successfully.",
            architecture: "Architecture details could not be parsed automatically.",
            improvements: []
        };
    }
}

/**
 * Generate an automated review for a Pull Request diff.
 */
export async function generatePRReview(
    prTitle: string,
    diffContent: string
): Promise<{ summary: string; score: number; fileReviews: { file_path: string; comments: { line: number; type: 'info' | 'warning' | 'error'; text: string }[] }[] }> {
    const prompt = `You are an elite senior staff engineer performing a Pull Request (PR) review.
Analyze the following PR diff. Find bugs, logic errors, performance bottlenecks, security flaws, or style inconsistencies.

PR Title: ${prTitle}
PR Diff Content:
${diffContent.slice(0, 30000)}

Evaluate the diff and output your review in JSON format matching this schema:
{
  "summary": "High-level summary of what this PR accomplishes and general feedback.",
  "score": 85, // Code quality score from 0 (disastrous) to 100 (flawless)
  "fileReviews": [
    {
      "file_path": "path/to/modified_file.ts",
      "comments": [
        {
          "line": 42, // The line number in the MODIFIED/NEW version of the file where the feedback applies
          "type": "warning", // "info", "warning", or "error"
          "text": "Detailed, constructive suggestion of what to change and why. Do not write raw code blocks here; describe the change conceptually."
        }
      ]
    }
  ]
}

Ensure your output is a valid JSON object. Do not include markdown code blocks.`;

    try {
        const text = await generateCompletion(prompt, true);
        return JSON.parse(extractJson(text));
    } catch (error) {
        console.error("PR review generation failed:", error);
        return {
            summary: "Failed to generate automated review for this PR.",
            score: 0,
            fileReviews: []
        };
    }
}

// ── Code Chunking ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSplitterLanguage(filePath: string): any {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const jsLike = ["js", "jsx", "ts", "tsx"];
    if (jsLike.includes(ext)) return "js";

    const mapping: Record<string, string> = {
        py: "python",
        java: "java",
        go: "go",
        cpp: "cpp",
        c: "cpp",
        h: "cpp",
        cs: "cpp",
        rb: "ruby",
        php: "php",
        swift: "swift",
        kt: "java",
        rs: "rust",
        md: "markdown",
        html: "html",
    };
    return mapping[ext] || "proto";
}

export async function chunkCode(content: string, filePath: string) {
    const language = getSplitterLanguage(filePath);

    const splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
        chunkSize: 3000,
        chunkOverlap: 300,
    });

    const docs = await splitter.createDocuments([content]);

    return docs.map((doc: Document) => {
        const startIdx = content.indexOf(doc.pageContent);
        const startLineNumber =
            content.substring(0, startIdx).split("\n").length;
        const chunkLinesCount = doc.pageContent.split("\n").length;

        return {
            content: doc.pageContent,
            start_line: startLineNumber,
            end_line: startLineNumber + chunkLinesCount - 1,
            metadata: {
                ...doc.metadata,
                file_path: filePath,
            },
        };
    });
}
