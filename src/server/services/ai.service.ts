import { GoogleGenAI } from "@google/genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { env, pipeline } from "@xenova/transformers";

// Disable local models loading in Next.js backend bundle
env.allowLocalModels = false;

// ── @google/genai SDK ──
const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || "placeholder" });

let embedder: any = null;

async function getEmbedder() {
    if (!embedder) {
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}

/**
 * Check if the error is a Gemini API quota exceeded (rate limit) error.
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
 * Returns a number[] vector (384 dimensions) suitable for pgvector.
 */
export async function embedQuery(text: string): Promise<number[]> {
    try {
        const generateEmbedding = await getEmbedder();
        const output = await generateEmbedding(text, {
            pooling: "mean",
            normalize: true,
        });
        return Array.from(output.data);
    } catch (error) {
        console.error("[LOCAL-EMBED] Query embedding failed:", error);
        throw error;
    }
}

/**
 * Embed multiple documents locally.
 * Returns an array of number[] vectors, one per input string.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
    try {
        const generateEmbedding = await getEmbedder();
        const allEmbeddings: number[][] = [];
        for (const text of texts) {
            const output = await generateEmbedding(text, {
                pooling: "mean",
                normalize: true,
            });
            allEmbeddings.push(Array.from(output.data));
        }
        return allEmbeddings;
    } catch (error) {
        console.error("[LOCAL-EMBED] Document batch embedding failed:", error);
        throw error;
    }
}

/**
 * A generalized completion client.
 * Calls OpenRouter if OPENROUTER_API_KEY is defined, otherwise falls back
 * to the direct Google GenAI SDK.
 */
export async function generateCompletion(prompt: string, jsonMode: boolean = false): Promise<string> {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

    if (openrouterKey) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = {
                model: model,
                messages: [
                    { role: "user", content: prompt }
                ]
            };
            if (jsonMode) {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openrouterKey}`,
                    "HTTP-Referer": "https://gitflair.ai",
                    "X-Title": "GitFlair",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response from OpenRouter");
            }
            return text;
        } catch (error) {
            console.error("OpenRouter API call failed, falling back to direct Gemini SDK:", error);
        }
    }

    // Direct Google GenAI SDK Fallback
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config: any = {};
        if (jsonMode) {
            config.responseMimeType = "application/json";
        }
        const res = await genai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: config
        });

        return res.text ?? "";
    } catch (error) {
        if (isQuotaExceeded(error)) {
            throw new Error("Gemini API quota exceeded. Please try again in a minute.");
        }
        throw error;
    }
}

export async function* generateCompletionStream(prompt: string, jsonMode: boolean = false): AsyncGenerator<string> {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

    if (openrouterKey) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = {
                model: model,
                messages: [{ role: "user", content: prompt }],
                stream: true,
            };
            if (jsonMode) {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openrouterKey}`,
                    "HTTP-Referer": "https://gitflair.ai",
                    "X-Title": "GitFlair",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok || !response.body) {
                const errText = await response.text().catch(() => "");
                throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data: ")) continue;
                    const payload = trimmed.slice(6);
                    if (payload === "[DONE]") return;
                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) yield delta;
                    } catch {
                        // skip malformed lines
                    }
                }
            }
            return;
        } catch (error) {
            console.error("OpenRouter stream failed, falling back to Gemini:", error);
        }
    }

    // Gemini fallback (non-streaming — collect then yield)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    if (jsonMode) {
        config.responseMimeType = "application/json";
    }
    const res = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
    });
    const text = res.text ?? "";
    if (text) {
        const chunks = text.match(/.{1,50}/g) || [text];
        for (const c of chunks) yield c;
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
    return generateCompletionStream(prompt);
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
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        return JSON.parse(cleanJson);
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
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        return JSON.parse(cleanJson);
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
