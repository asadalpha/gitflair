# AI Notes 🧠

This project was built with a heavy emphasis on AI-driven development. Here is a breakdown of how different AI tools and techniques were utilized.

##  AI Tools Used

- **GitHub Copilot**: Used as the primary pair programmer for architecting the RAG system, implementing the status page, and refining the UI/UX.
- **ChatGPT / Claude**: Used for initial brainstorming, complex algorithm design (vector similarity functions), and generating consistent color palettes.


##  Key Prompts & Tasks

### 1. RAG System Architecture

> _"Design a system that fetches public GitHub repo contents recursively, chunks them logically, and stores them in Supabase using pgvector for semantic search with Gemini embeddings."_

### 2. Status Dashboard implementation

> _"Make a status page that shows health of backend, database, and LLM connection. Make it minimal theme and add it where semantic indexing is written."_

### 3. UI Refinement

> _"Enhance the landing page UI with smooth on-mount animations, glassmorphism, and a premium dark gold/zinc palette. Remove generic scroll animations."_

##  AI-Specific Implementation Details

- **Embedding Generation**: Using `gemini-embedding-001` with a dimension size of 3072.
- **Context Handling**: Implementing a chat history memory window (last 10 messages) to provide conversational context to the LLM.
- **Code Grounding**: Directing the LLM to provide evidence for its answers by referencing file paths and line ranges found in the retrieved vector chunks.
