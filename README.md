# GitFlair 

**GitFlair** is a premium AI-powered repository intelligence platform. It allows users to index any public GitHub repository and ask natural language questions about the codebase, receiving grounded answers with specific file paths and line ranges.

##  Features

- **Semantic Indexing**: Deep code analysis using Google Gemini embeddings and Supabase pgvector storage.
- **Code-Grounded Q&A**: Get precise answers backed by actual code snippets from the repo.
- **Real-time Health Monitoring**: Integrated status dashboard for Backend, Database, and LLM connectivity.
- **Fast Ingestion**: Parallel processing and chunking for efficient repository indexing.
- **Premium UI/UX**: Minimal, dark-themed interface built with Next.js and Framer Motion.

## 🏗 How it Works (RAG Pipeline)

1. **Ingestion**: The user provides a GitHub URL. The backend uses the GitHub API to fetch recursive file trees, filtering for supported source code files.
2. **Chunking**: Code files are split into logical chunks using LangChain's `RecursiveCharacterTextSplitter`, preserving context and language-specific syntax.
3. **Embedding**: Each chunk is converted into a 3072-dimensional vector using the `gemini-embedding-001` model.
4. **Storage**: Vectors and metadata (file paths, line ranges) are stored in Supabase using the `pgvector` extension.
5. **Retrieval**: When a user asks a question, the query is embedded and a cosine similarity search is performed to find the most relevant code snippets.
6. **Generation**: The retrieved snippets and chat history are passed to `gemini-2.5-flash` to generate a grounded, accurate response.

## 🛠 Tech Stack

- **Frontend**: Next.js (App Router), TailwindCSS, Framer Motion, Lucide React.
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + pgvector).
- **AI/LLM**: Google Gemini (Gemini 2.5 Flash/Flash), LangChain for text splitting.

## 🚀 Getting Started

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
    - `GOOGLE_GENAI_API_KEY`
    - `GITHUB_TOKEN`
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
5.  **Access the app**:
    Open [http://localhost:3000](http://localhost:3000)

## � Project Structure

- `src/app`: Next.js pages and API routes.
- `src/components`: Reusable UI components (Chat, Status, RepoInput).
- `src/lib`: Core logic for Gemini, GitHub API, and Supabase integration.
- `src/db`: Database schema and migration files.

## 🛣 Routes

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

## �📡 System Status

Check the live health of all services at [/status](http://localhost:3000/status).


