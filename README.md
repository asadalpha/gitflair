# GitFlair

**GitFlair** is a premium AI-powered repository intelligence platform. It allows users to index any public GitHub repository and ask natural language questions about the codebase, receiving grounded answers with specific file paths and line ranges.

## Features

- **Semantic Indexing**: Local MiniLM embeddings and pgvector-compatible storage.
- **Code-Grounded Q&A**: Get precise answers backed by actual code snippets from the repo.
- **Real-time Health Monitoring**: Integrated status dashboard for Backend, Database, and LLM connectivity.
- **Fast Ingestion**: Parallel processing and chunking for efficient repository indexing.
- **Premium UI/UX**: Minimal, dark-themed interface built with Next.js and Framer Motion.

## 📉 Usage Limits

To ensure fair usage and manage API costs, the following limits are in place:

- **Repositories**: Users can index up to **2 repositories** at a time.
- **Chats**: Each repository supports up to **10 Q&A interactions**.

## How it Works (RAG Pipeline)

1. **Ingestion**: The user provides a GitHub URL. The backend uses the GitHub API to fetch recursive file trees, filtering for supported source code files.
2. **Chunking**: Code files are split into logical chunks using LangChain's `RecursiveCharacterTextSplitter`, preserving context and language-specific syntax.
3. **Embedding**: Each chunk is converted into a 1024-dimensional vector using OpenRouter's free `liquid/lfm-2.5-embedding-350m:free` model (with a deterministic fallback if unavailable).
4. **Storage**: Vectors and metadata (file paths, line ranges) are stored in Supabase using the `pgvector` extension.
5. **Retrieval**: When a user asks a question, the query is embedded and a cosine similarity search is performed to find the most relevant code snippets.
6. **Generation**: The retrieved snippets and chat history are sent to OpenRouter's `openrouter/free` model first, with automatic fallback to OpenCode Go's OpenAI-compatible `/v1/chat/completions` endpoint.

## Tech Stack

- **Frontend**: Next.js (App Router), TailwindCSS, Framer Motion, Lucide React.
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + pgvector).
- **AI/LLM**: OpenRouter `openrouter/free` with OpenCode Go fallback; OpenRouter Liquid embeddings; LangChain for text splitting.

## Getting Started

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/your-username/gitflair.git
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up Environment Variables**:
    Create a `.env` file based on `.env.example` and add your keys:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENCODE_GO_API_KEY`
     - `OPENCODE_GO_MODEL` (for example, `glm-5.3-flash`)
     - `OPENROUTER_API_KEY`
     - `GITHUB_TOKEN`
4.  **Apply database migrations**:
    ```bash
    npm run db:migrate
    ```
    Run this command after every schema migration and during deployment. Do not use `drizzle-kit push` for shared environments; committed SQL migrations are the source of truth.
5.  **Run the development server**:
    ```bash
    npm run dev
    ```
6.  **Access the app**:
    Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `src/app`: Next.js pages and API routes.
- `src/components`: Reusable UI components (Chat, Status, RepoInput).
- `src/lib`: Core logic for Gemini, GitHub API, and Supabase integration.
- `src/db`: Database schema and migration files.

## Routes

### Frontend Pages

- `/`: **Home** - Landing page with repository input and feature overview.
- `/status`: **System Status** - Real-time health dashboard for all services.

### API Endpoints

- `GET /api/health`: Returns overall system health and service-specific latency.
- `POST /api/ingest`: Accepts a GitHub URL, fetches code, chunks it, and generates embeddings.
- `GET /api/repos`: Lists all repositories indexed by the current user.
- `GET /api/status?url=...`: Checks the indexing status of a specific repository.
- `POST /api/ask`: Handles natural language questions using RAG (Retrieval Augmented Generation).
- `GET /api/history?repoId=...`: Fetches chat history for a specific repository.

## System Status

Check the live health of all services at [/status](http://localhost:3000/status).
