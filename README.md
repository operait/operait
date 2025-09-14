# Operait Backend (SSE + RAG)

## Endpoints
- `POST /api/chat` → one-shot chat
- `POST /api/chat/stream` → SSE streaming chat
- `POST /api/rag-chat/stream` → SSE streaming RAG with sources

## Deploy on Render
1. Push this folder to GitHub
2. Create new Web Service on Render
3. Root directory: `backend/`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env vars: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
