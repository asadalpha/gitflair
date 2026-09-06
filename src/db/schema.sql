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
  analysis_json jsonb,
  languages_json jsonb,
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
  embedding vector(384), -- Xenova/all-MiniLM-L6-v2 outputs 384 dimensions
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

-- Pull Request Reviews table
create table if not exists pr_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous',
  repo_id uuid references repositories(id) on delete cascade,
  pr_number integer not null,
  title text not null,
  status text not null default 'pending', -- pending, completed, failed
  summary text,
  score integer, -- 0 to 100 code quality rating
  file_reviews jsonb, -- array of { file_path, comments: [ { line, type, text } ] }
  created_at timestamp with time zone default now(),
  unique(repo_id, pr_number, user_id)
);

create index if not exists idx_pr_reviews_repo_id on pr_reviews(repo_id);

-- Repo-wise Code Notes table
create table if not exists code_notes (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references repositories(id) on delete cascade,
  user_id text not null default 'anonymous',
  code text not null,
  title text not null,
  completed boolean not null default false,
  category text not null default 'logic',
  assignee text not null default 'Alpha',
  date text not null default 'Today',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_code_notes_repo_id on code_notes(repo_id);
create index if not exists idx_code_notes_user_id on code_notes(user_id);

-- Indexes for user scoping
create index if not exists idx_repos_user_id on repositories(user_id);
create index if not exists idx_history_user_id on qa_history(user_id);

-- Index for searching chunks by repo
create index idx_chunks_repo_id on code_chunks(repo_id);

-- Vector similarity search function
create or replace function match_code_chunks (
  query_embedding vector(384),
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
