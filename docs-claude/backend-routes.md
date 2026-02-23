# Backend Routes - HR Resume Agent

## Base URL
`http://localhost:8000`

## Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/` | `app.main.index` | Serves index.html template |
| POST | `/api/resumes/upload` | `app.routers.upload.upload_resumes` | Upload resume files (PDF/DOCX). Accepts `files` (multipart) + optional `position_tag` (form). Returns `UploadBatchResponse` with uploaded list and errors. |
| GET | `/api/resumes` | `app.routers.upload.list_resumes` | List all resumes. Optional query param `position_tag` to filter. Returns `list[ResumeListItem]`. |
| DELETE | `/api/resumes/{resume_id}` | `app.routers.upload.delete_resume` | Delete resume, its chunks, and saved file from disk. Returns `{"deleted": true}` or 404. |
| GET | `/api/resumes/{resume_id}/download` | `app.routers.upload.download_resume` | Download original resume file. Returns `FileResponse` with correct media type (PDF/DOCX). 404 if not found. |
| POST | `/api/search` | `app.routers.search.search_resumes` | Vector similarity search. JSON body: `{query: str, top_k: int=5, position_tag: str|None}`. Embeds query via VoyageAI, runs Atlas vector search. Returns `list[SearchResult]`. |

| POST | `/api/chat` | `app.routers.chat.chat` | SSE streaming chat. JSON body: `ChatRequest{message, session_id?, position_tag?, model?}`. Model options: `claude-sonnet-4-5-20250929` (default), `claude-3-5-haiku-20241022`, `claude-opus-4-5-20250929`. Creates/loads session, streams agent response as SSE events (session, token, tool_call, error, done). Persists conversation to MongoDB `chat_sessions`. |
| GET | `/api/chat/sessions` | `app.routers.chat.list_sessions` | List all chat sessions sorted by `updated_at` desc. Returns `list[ChatSessionItem]` with id, created_at, updated_at, message_count, position_tag. |
| DELETE | `/api/chat/sessions/{session_id}` | `app.routers.chat.delete_session` | Delete a chat session. Returns `{"deleted": true}` or 404. |
