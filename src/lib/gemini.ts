import { GoogleGenAI } from "@google/genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

if (!process.env.GOOGLE_GENAI_API_KEY) {
    throw new Error("Missing GOOGLE_GENAI_API_KEY");
}

// ── @google/genai SDK ──
const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

/**
 * Embed a single query string.
 * Returns a number[] vector (3072 dimensions) suitable for pgvector.
 */
export async function embedQuery(text: string): Promise<number[]> {
    const res = await genai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
        config: { taskType: "RETRIEVAL_QUERY" },
    });
    return res.embeddings?.[0]?.values ?? [];
}

/**
 * Embed multiple documents in batches of 100.
 * Returns an array of number[] vectors, one per input string.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const res = await genai.models.embedContent({
            model: "gemini-embedding-001",
            contents: batch,
            config: { taskType: "RETRIEVAL_DOCUMENT" },
        });
        const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
        allEmbeddings.push(...vectors);
    }

    return allEmbeddings;
}

/**
 * Chat with the Gemini model using the new SDK directly.
 * This replaces LangChain's ChatGoogleGenerativeAI which had
 * compatibility issues with newer model names.
 */
export async function chatWithContext(
    context: string,
    question: string,
    chatHistory?: { role: string; content: string }[]
): Promise<string> {
    const historyBlock = chatHistory && chatHistory.length > 0
        ? `\nRecent conversation history (for context, do NOT repeat previous answers):\n${chatHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')}\n`
        : '';

    const prompt = `You are a concise, helpful senior software engineer answering questions about a codebase in a chat. The UI renders full markdown.

RULES — follow these strictly:
1. NEVER include raw source code from the codebase in your response. The UI shows code snippets separately.
2. For general questions: keep your answer to 1-3 short paragraphs. Be direct — no filler.
3. Reference file paths inline using backtick formatting like \`src/lib/auth.ts\`.
4. If the user says "show me" or asks for code, describe WHERE the code is (file path + line range) but still do NOT paste source code.
5. If you can't answer from the snippets, say: "I couldn't find that in the indexed codebase."
6. Sound like a teammate — casual, knowledgeable, brief.

FORMATTING — match the format to the question:
- For FOLDER STRUCTURE questions: use a markdown code block with a tree-style notation showing the directory layout. Add brief inline comments. Then add a short paragraph of suggestions.
- For TECH STACK questions: use a brief markdown table or bullet list showing the technology → purpose mapping. Then add suggestions for improvements.
- For ARCHITECTURE questions: use headers and short sections if needed.
- For simple questions: just use plain paragraphs, no special formatting.

EXTRA CAPABILITIES:
- FOLDER STRUCTURE: Analyze file paths from the context. Show the current tree, then suggest improvements (grouping by feature, separating concerns, adding missing layers).
- TECH STACK: Identify technologies from imports/configs. Suggest modern alternatives, missing tools, best practices. Name actual packages.
- IMPROVEMENTS: When asked, provide actionable suggestions — not vague advice.
${historyBlock}
Context from the codebase:
${context}

User question: ${question}`;

    const res = await genai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
    });

    return res.text ?? "I could not find this in the indexed codebase.";
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