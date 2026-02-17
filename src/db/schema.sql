-- Enable pgvector extension
create extension if not exists vector;

-- Repositories table
create table if not exists repositories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous', -- anonymous browser-based user ID
  url text not null,
  name text not null,
  full_name text not null,
  created_at timestamp with time zone default now(),
  indexed_at timestamp with time zone,
  unique(url, user_id) -- same repo can be indexed by different users
);

-- Code chunks table
create table if not exists code_chunks (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references repositories(id) on delete cascade,
  file_path text not null,
  content text not null,
  start_line integer not null,
  end_line integer not null,
  language text not null,
  embedding vector(3072), -- gemini-embedding-001 outputs 3072 dimensions by default
  created_at timestamp with time zone default now()
);

-- Q&A history table
create table if not exists qa_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous',
  repo_id uuid references repositories(id) on delete cascade,
  question text not null,
  answer text not null,
  references_json jsonb not null,
  created_at timestamp with time zone default now()
);

-- Indexes for user scoping
create index if not exists idx_repos_user_id on repositories(user_id);
create index if not exists idx_history_user_id on qa_history(user_id);

-- Index for searching chunks by repo
create index idx_chunks_repo_id on code_chunks(repo_id);

-- Vector similarity search function
create or replace function match_code_chunks (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  p_repo_id uuid
)
returns table (
  id uuid,
  repo_id uuid,
  file_path text,
  content text,
  start_line int,
  end_line int,
  language text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    code_chunks.id,
    code_chunks.repo_id,
    code_chunks.file_path,
    code_chunks.content,
    code_chunks.start_line,
    code_chunks.end_line,
    code_chunks.language,
    1 - (code_chunks.embedding <=> query_embedding) as similarity
  from code_chunks
  where code_chunks.repo_id = p_repo_id
  and 1 - (code_chunks.embedding <=> query_embedding) > match_threshold
  order by code_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
