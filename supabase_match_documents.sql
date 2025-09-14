-- Supabase pgvector search function
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table(id uuid, content text, similarity float)
language sql stable
as $$
  select id, content, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
