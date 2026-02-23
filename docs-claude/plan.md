# HR Resume Agent - Phased Implementation Plan

## Project Overview

An AI-powered HR agent that allows uploading multiple resumes (PDF + DOCX), parses and chunks them by resume sections, stores embeddings in MongoDB Atlas Vector Search (using VoyageAI), and provides a streaming chat interface where recruiters can describe a role and get detailed candidate rankings with analysis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas (documents + vector search) |
| Embeddings | VoyageAI (`voyage-3`) |
| LLM | Anthropic Claude (via LangChain) |
| Agent Framework | LangGraph + LangChain |
| Templating | Jinja2 (Ninja) |
| Frontend | HTML/CSS/JS single-page app with SSE streaming |
| File Parsing | PyPDF2/pdfplumber (PDF), python-docx (DOCX) |

## Environment Variables (from .env.example)

- `VOYAGE_API_KEY` - VoyageAI API key for embeddings
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude LLM
- `ATLAS_CONNECTION_STRING` - MongoDB Atlas connection string

---

## Phase 1: Project Scaffolding & Infrastructure

**Assigned to**: devops-engineer, senior-backend-engineer
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Initialize Python project with `uv` (pyproject.toml, uv.lock)
- [x] Set up virtual environment with `uv sync`
- [x] Install core dependencies: fastapi, uvicorn, motor (async MongoDB), pymongo, python-dotenv, jinja2
- [x] Install AI/ML dependencies: langchain, langchain-anthropic, langchain-voyageai, langchain-mongodb, langgraph, voyageai
- [x] Install file parsing dependencies: pdfplumber, python-docx
- [x] Create project folder structure:
  ```
  app/
  ├── main.py                  # FastAPI entry point
  ├── config.py                # Settings & env loading
  ├── database.py              # MongoDB connection (motor async)
  ├── routers/
  │   ├── __init__.py
  │   ├── upload.py            # Resume upload endpoints
  │   └── chat.py              # Chat/streaming endpoints
  ├── services/
  │   ├── __init__.py
  │   ├── parser.py            # Resume file parsing (PDF/DOCX)
  │   ├── chunker.py           # Section-based chunking
  │   ├── embeddings.py        # VoyageAI embedding service
  │   └── vector_store.py      # MongoDB vector store operations
  ├── agent/
  │   ├── __init__.py
  │   ├── graph.py             # LangGraph agent definition
  │   ├── nodes.py             # Agent nodes (retrieve, analyze, rank)
  │   ├── state.py             # Agent state schema
  │   └── tools.py             # Agent tools (search resumes, etc.)
  ├── models/
  │   ├── __init__.py
  │   └── schemas.py           # Pydantic models
  ├── templates/
  │   └── index.html           # Single-page app template
  └── static/
      ├── css/
      │   └── style.css
      └── js/
          └── app.js           # Chat UI, upload handling, SSE
  ```
- [x] Create `config.py` with Pydantic Settings loading env vars
- [x] Create `database.py` with async MongoDB connection (motor) + connection lifecycle
- [x] Create `main.py` with FastAPI app, CORS, Jinja2 templates, static files mount, lifespan events
- [x] Create `render.yaml` for deployment
- [x] Consult devops for port assignment (port 8000)
- [x] Verify MongoDB Atlas connection works (ping on startup)

#### Phase 1 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Full project scaffolding: uv init, all dependencies, folder structure, config.py (pydantic-settings), database.py (motor async), main.py (FastAPI with lifespan, CORS, Jinja2, static), render.yaml, requirements.txt, backend-routes.md |
| Were there any deviations from the plan? | Added pydantic-settings as extra dependency (needed for BaseSettings). Generated requirements.txt for Render deployment (Render uses pip). Code-simplifier refined config to use SettingsConfigDict, added type annotations to database.py, improved import ordering in main.py |
| Issues/blockers encountered? | None |
| How were issues resolved? | N/A |
| Any technical debt introduced? | None. MongoDB connection verification depends on .env being present at startup |
| Recommendations for next phase? | .env file must be created with real credentials before testing. Phase 2 can proceed immediately - all placeholder files are in place |

**Completed by**: devops-engineer (init, deps, port), senior-backend-engineer (structure, core files), code-simplifier (refinement)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Config changes**: VOYAGE_API_KEY, ANTHROPIC_API_KEY, ATLAS_CONNECTION_STRING in .env
- **New dependencies**: fastapi, uvicorn, motor, pymongo, python-dotenv, jinja2, pydantic-settings, langchain, langchain-anthropic, langchain-voyageai, langchain-mongodb, langgraph, voyageai, pdfplumber, python-docx (101 total packages)
- **Port**: 8000 (assigned by devops)
- **Database**: MongoDB Atlas cluster must be accessible, database name: `hr_agent`
- **Entry point**: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

---

## Phase 2: Resume Upload & Parsing

**Assigned to**: senior-backend-engineer
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Implement `services/parser.py`:
  - PDF parsing with pdfplumber (extract text with layout awareness)
  - DOCX parsing with python-docx (extract text preserving structure)
  - Handle encoding issues and malformed files gracefully
- [x] Implement `services/chunker.py` - section-based chunking:
  - Detect resume sections by common headers: Education, Experience, Skills, Summary/Objective, Projects, Certifications, etc.
  - Split resume text into semantic sections
  - For large sections, sub-chunk with overlap to stay within embedding limits
  - Each chunk retains metadata: `{candidate_name, file_name, section_type, chunk_index, position_tag (optional)}`
- [x] Implement `models/schemas.py`:
  - `CandidateInfo` - extracted candidate info (name, email, phone)
  - `ResumeChunk` - chunk model (text, section_type, chunk_index, candidate_name, file_name, position_tag)
  - `ResumeDocument` - MongoDB document model (candidate_name, file_name, raw_text, upload_date, position_tag, sections_count)
  - `ResumeUploadResponse` - API response after upload
  - `ResumeListItem` - list endpoint item schema
  - `UploadBatchResponse` - multi-file upload response
- [x] Implement `routers/upload.py`:
  - `POST /api/resumes/upload` - accept multiple files (PDF/DOCX), optional position_tag
  - Parse files, extract text, chunk by sections
  - Store raw resume document in `resumes` collection
  - Store chunks in `resume_chunks` collection (without embeddings - Phase 3)
  - Return upload status with parsed candidate names
  - `GET /api/resumes` - list all uploaded resumes (with optional position_tag filter)
  - `DELETE /api/resumes/{id}` - delete a resume and its chunks
- [x] Create basic candidate name extraction from resume text (in `services/extractor.py`)
- [x] Update `docs-claude/backend-routes.md` with new endpoints

#### Phase 2 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Resume parser (PDF/DOCX via pdfplumber/python-docx), section-based chunker with 9 section types and overlap sub-chunking, candidate info extractor (name/email/phone heuristics), 6 Pydantic schemas, upload router with 3 endpoints (upload/list/delete), wired into main.py |
| Were there any deviations from the plan? | Added `services/extractor.py` as separate file (plan had it in parser.py). Added `ResumeUploadResponse`, `ResumeListItem`, `UploadBatchResponse` schemas beyond original plan. Chunks stored without embeddings (Phase 3 will add). |
| Issues/blockers encountered? | Phone regex initially capped at 15 chars which truncated longer formatted numbers - fixed to 20 chars. |
| How were issues resolved? | Extended phone regex pattern from `{7,15}` to `{7,20}` to accommodate formatted phone numbers like `+1 (555) 987-6543`. |
| Any technical debt introduced? | Chunks stored without embeddings field - Phase 3 will need to either backfill or handle both cases. |
| Recommendations for next phase? | Phase 3 can proceed immediately. The `resume_chunks` collection documents need an `embedding` field added during the embedding pipeline. Consider batch embedding to respect VoyageAI rate limits. |

**Completed by**: senior-backend-engineer (parser, chunker, schemas, router), senior-backend-engineer (extractor), code-simplifier (refinement)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Database changes**: `resumes` collection created (stores raw resume docs)
- **API changes**: POST /api/resumes/upload, GET /api/resumes, DELETE /api/resumes/{id}
- **Chunking output**: List of chunks with metadata ready for embedding in Phase 3

---

### Phase 2.1.0: Save Original Resume Files to Uploads Folder

**Assigned to**: senior-backend-engineer
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Create `uploads/` directory in project root (add to `.gitignore`)
- [x] Update `POST /api/resumes/upload` to save original file bytes to `uploads/{resume_id}_{filename}` on disk
- [x] Store the `file_path` field in the `resumes` MongoDB document so the file can be retrieved later
- [x] Update `DELETE /api/resumes/{resume_id}` to also delete the file from `uploads/`
- [x] Add `GET /api/resumes/{resume_id}/download` endpoint to serve the original file
- [x] Update `models/schemas.py` - add `file_path: str | None = None` to `ResumeDocument`
- [x] Update `docs-claude/backend-routes.md` with new download endpoint

#### Phase 2.1.0 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | File persistence for uploaded resumes: saves original files to `uploads/` dir, stores `file_path` in MongoDB, adds download endpoint, cleans up files on delete. Extracted `_parse_object_id` helper to reduce duplication. |
| Were there any deviations from the plan? | Added `_parse_object_id` helper and `_MEDIA_TYPES` dict (code-simplifier refinement). Narrowed `except Exception` to `except InvalidId` for ObjectId parsing. Hoisted uploads dir creation above the file loop. |
| Issues/blockers encountered? | None |
| How were issues resolved? | N/A |
| Any technical debt introduced? | Local file storage won't persist across Render deploys - will need S3 or GridFS for production. |
| Recommendations for next phase? | Phase 3 can proceed. The `file_path` field is now available in resume documents for any future use. |

**Completed by**: senior-backend-engineer, code-simplifier
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Config changes**: `UPLOADS_DIR` path (default: `./uploads`)
- **New endpoint**: GET /api/resumes/{resume_id}/download
- **Schema changes**: `file_path` added to ResumeDocument
- **Deployment note**: `uploads/` directory must be writable; for Render, consider switching to S3/GridFS later

---

## Phase 3: Embeddings & MongoDB Vector Search

**Assigned to**: senior-backend-engineer
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Implement `services/embeddings.py`:
  - Initialize VoyageAI client with API key (lazy init pattern)
  - `embed_texts(texts: list[str]) -> list[list[float]]` - batch embed chunks (128/batch)
  - `embed_query(text: str) -> list[float]` - single query embedding (input_type="query")
  - Use `voyage-3` model (1024 dimensions)
  - Handle rate limiting and batch size limits
- [x] Implement `services/vector_store.py`:
  - Store chunks with embeddings in `resume_chunks` collection
  - Document schema: `{text, embedding, resume_id, candidate_name, section_type, chunk_index, position_tag, file_name}`
  - `store_chunks(chunks, embeddings)` - batch insert chunks with embeddings
  - `search_similar(query_embedding, top_k, filter)` - vector similarity search via `$vectorSearch`
  - `delete_by_resume_id(resume_id)` - cleanup on resume deletion
  - `get_all_chunks_for_resume(resume_id)` - retrieve chunks without embedding vectors
- [x] Create MongoDB Atlas Vector Search index on `resume_chunks` collection:
  - Index name: `resume_vector_index` (auto-created on startup via `ensure_vector_index()`)
  - Field: `embedding` (vector, 1024 dimensions, cosine similarity)
  - Filter fields: `position_tag`, `candidate_name`
  - Uses `pymongo.operations.SearchIndexModel` + `create_search_index()`
- [x] Integrate embedding pipeline into upload flow:
  - After chunking in upload endpoint -> background task generates embeddings -> stores in vector collection
  - Uses FastAPI `BackgroundTasks` so upload returns immediately
  - `embedding_status` field tracks lifecycle: pending -> processing -> completed/failed
- [x] Implement vector search endpoint for testing:
  - `POST /api/search` - accepts query text, embeds via VoyageAI, returns similar chunks with scores
- [x] Update `docs-claude/backend-routes.md`

#### Phase 3 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | VoyageAI embedding service (embed_texts + embed_query with batching), MongoDB Atlas vector store (store, search, delete, get_all), auto vector index creation on startup, background embedding pipeline in upload flow, POST /api/search debug endpoint, SearchRequest/SearchResult schemas |
| Were there any deviations from the plan? | Added `embed_query()` function with `input_type="query"` for asymmetric search (plan only mentioned embed_texts). Added `get_all_chunks_for_resume()` utility. Added `embedding_status` tracking on resume documents. Extracted `VECTOR_INDEX_NAME` as shared constant in database.py. Code-simplifier eliminated redundant DB update call in upload flow. |
| Issues/blockers encountered? | None |
| How were issues resolved? | N/A |
| Any technical debt introduced? | None. Vector index is auto-created via pymongo SearchIndexModel API on startup. |
| Recommendations for next phase? | Phase 4 can proceed. The vector search pipeline is fully operational: embed_query() + search_similar() provide the retrieval foundation for the LangGraph agent. The `get_all_chunks_for_resume()` function enables full resume reconstruction for candidate analysis. |

**Completed by**: senior-backend-engineer (embeddings, vector_store, upload integration, search router), code-simplifier (refinement)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Database changes**: `resume_chunks` collection with vector index `resume_vector_index` (auto-created on startup)
- **API changes**: POST /api/search (debug endpoint for vector similarity search)
- **Config**: VoyageAI model `voyage-3`, embedding dimensions 1024, cosine similarity
- **Schema changes**: `embedding_status` field on ResumeDocument, `SearchRequest`/`SearchResult` Pydantic models
- **Key functions for Phase 4**: `embed_query()` for query embedding, `search_similar()` for vector retrieval, `get_all_chunks_for_resume()` for full resume reconstruction
- **Shared constant**: `VECTOR_INDEX_NAME` exported from `database.py`, imported by `vector_store.py`

---

## Phase 4: LangGraph Agent (Core Intelligence)

**Assigned to**: senior-backend-engineer, code-simplifier
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Implement `agent/state.py`:
  - `AgentState` TypedDict with: messages (Annotated with add_messages reducer), role_description, top_k, retrieved_chunks, candidates, analysis, position_tag
- [x] Implement `agent/tools.py`:
  - `search_resumes` tool - async vector search via VoyageAI embed_query + MongoDB search_similar, returns formatted results with candidate, section, score, snippet
  - `get_candidate_resume` tool - case-insensitive candidate lookup, retrieves all chunks, reconstructs full resume organized by section
  - `list_candidates` tool - lists all candidates with metadata, optional position_tag filter
  - All tools async, error-resilient (return error strings instead of raising)
- [x] Implement `agent/nodes.py`:
  - `get_llm()` - Cached ChatAnthropic (claude-sonnet-4-5-20250929) with tools bound
  - `agent_node` - Builds dynamic system prompt (HR recruiter persona + role/position context), invokes LLM
  - `tool_node` - Dispatches tool calls from AI message, handles errors gracefully
  - `should_continue` - Routes to "tools" if tool_calls present, else "end"
- [x] Implement `agent/graph.py`:
  - ReAct loop: START -> agent -> (tools -> agent)* -> END
  - `build_graph()` / `get_graph()` (cached) for graph compilation
  - `run_agent()` - Non-streaming invocation with history replay
  - `stream_agent()` - AsyncGenerator yielding SSE-friendly events: token, tool_call, done, error
  - Helper functions for clean streaming: `_extract_token_events`, `_extract_tool_call_events`, `_parse_tc_args`
- [x] Verify all imports and graph compilation pass

#### Phase 4 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Full LangGraph ReAct agent: AgentState TypedDict, 3 async tools (search_resumes, get_candidate_resume, list_candidates), agent/tool nodes with Claude claude-sonnet-4-5-20250929, conditional routing, graph builder with cached compilation, run_agent (non-streaming) and stream_agent (SSE async generator) |
| Were there any deviations from the plan? | Used standard ReAct tool-calling pattern instead of separate understand_query/retrieve/analyze/rank nodes. The LLM decides its own flow via tool calls, which is more flexible and idiomatic for LangGraph. The system prompt guides the LLM to perform analysis, ranking, and fit scoring naturally. |
| Issues/blockers encountered? | `CompiledGraph` import path was incorrect (`langgraph.graph.graph` doesn't exist). Fixed to `langgraph.graph.state.CompiledStateGraph`. |
| How were issues resolved? | Introspected the installed langgraph package to find the correct import path. |
| Any technical debt introduced? | None. The ReAct pattern is well-established and the streaming helpers are cleanly factored out. |
| Recommendations for next phase? | Phase 5 should consume `stream_agent()` directly for SSE. The generator yields `{"type": "token", "content": "..."}` events ready for SSE formatting. Chat session history should be stored as `[{"role": "user"|"assistant", "content": "..."}]` dicts compatible with `_build_initial_state()`. |

**Completed by**: senior-backend-engineer (state, tools, nodes, graph), code-simplifier (refinement)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Dependencies**: langchain-anthropic, langgraph, langchain-voyageai (all pre-installed in Phase 1)
- **Agent streaming**: `stream_agent()` yields `{"type": "token"|"tool_call"|"done"|"error", ...}` dicts via `astream_events(version="v2")`
- **State management**: `_build_initial_state()` accepts history as list of `{"role", "content"}` dicts - Phase 5 should store/replay chat sessions in this format
- **LLM model**: `claude-sonnet-4-5-20250929` with `max_tokens=4096`, streaming enabled
- **Key imports for Phase 5**: `from app.agent.graph import stream_agent, run_agent`

---

## Phase 5: Chat Streaming Endpoint

**Assigned to**: senior-backend-engineer, code-simplifier
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Implement `routers/chat.py`:
  - `POST /api/chat` - SSE (Server-Sent Events) streaming endpoint
    - Accepts: `ChatRequest{message: str, session_id: str (optional), position_tag: str (optional)}`
    - Creates/reuses chat session with conversation history
    - Invokes LangGraph `stream_agent()` with streaming
    - Streams tokens back via SSE (`text/event-stream`)
    - SSE event sequence: session -> token* -> tool_call* -> done (or error -> done)
    - Persists full conversation turn to MongoDB after streaming completes
  - `GET /api/chat/sessions` - list chat sessions sorted by updated_at desc
  - `DELETE /api/chat/sessions/{session_id}` - delete a chat session
- [x] Implement chat session storage in MongoDB (`chat_sessions` collection):
  - `{_id, messages: [{role, content}], position_tag, created_at, updated_at}`
- [x] Handle streaming properly:
  - `StreamingResponse` with `media_type="text/event-stream"`
  - `_sse_event()` helper for consistent `data: {json}\n\n` formatting
  - SSE headers: `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`
  - Sends `session_id` as first event, `done` with `session_id` as last event
- [x] Update `docs-claude/backend-routes.md`
- [x] Wire chat router into `main.py` (`app.include_router(chat_router)`)

#### Phase 5 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Chat streaming router with 3 endpoints: POST /api/chat (SSE streaming via stream_agent), GET /api/chat/sessions (list sessions), DELETE /api/chat/sessions/{session_id}. Added ChatRequest and ChatSessionItem Pydantic schemas. Session persistence in MongoDB chat_sessions collection. Wired router into main.py. |
| Were there any deviations from the plan? | SSE format uses typed JSON events (`{"type":"token","content":"..."}`) instead of raw text, which is richer for the frontend. Added session_id as first SSE event so frontend can track it immediately. Added `X-Accel-Buffering: no` header for nginx/reverse proxy compatibility. |
| Issues/blockers encountered? | None |
| How were issues resolved? | N/A |
| Any technical debt introduced? | None. Code-simplifier extracted `_sse_event` and `_parse_session_id` helpers for consistency with existing codebase patterns. |
| Recommendations for next phase? | Phase 6 (Frontend) should consume the SSE stream using `fetch` + `ReadableStream` (not `EventSource`, since POST requests are needed). Parse each `data:` line as JSON and switch on the `type` field. The first event (`type: "session"`) provides the `session_id` to store for follow-up messages. |

**Completed by**: senior-backend-engineer (router, schemas, wiring), code-simplifier (refinement: _sse_event helper, _parse_session_id helper)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Database changes**: `chat_sessions` collection with schema `{_id, messages: [{role, content}], position_tag, created_at, updated_at}`
- **API changes**: POST /api/chat (SSE), GET /api/chat/sessions, DELETE /api/chat/sessions/{session_id}
- **SSE event types**: `session` (first, has session_id), `token` (streamed text), `tool_call` (agent tool usage), `error` (failures), `done` (last, has session_id)
- **Schema additions**: `ChatRequest`, `ChatSessionItem` in models/schemas.py
- **Frontend consumption**: Use `fetch` POST to `/api/chat` with `ChatRequest` JSON body, read response as SSE stream. Do NOT use `EventSource` (it only supports GET).

---

## Phase 6: Frontend UI (Single Page App)

**Assigned to**: frontend-engineer, code-simplifier
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] Implement `templates/index.html` (Jinja2):
  - Single-page layout with sidebar + main chat area
  - **Sidebar**:
    - Resume upload section (drag & drop + file picker for PDF/DOCX)
    - Optional position tag input for grouping uploads
    - File list showing selected files before upload (with remove buttons)
    - List of uploaded resumes with download/delete actions
    - Resume count badge
  - **Main area**:
    - Chat message area with scrollable history
    - Message bubbles: user (right) and agent (left)
    - Streaming text rendering (tokens appear as they arrive)
    - Markdown rendering for agent responses (tables, lists, bold for fit scores)
    - Input bar at bottom with send button
    - "New chat" button to reset session
    - Position scope selector for filtering chat by position tag
- [x] Implement `static/js/app.js`:
  - File upload via `FormData` + `fetch` to `/api/resumes/upload`
  - Multi-file upload support with file list UI and remove buttons
  - Chat via `fetch` + `ReadableStream` to `/api/chat` (not EventSource since POST is needed)
  - SSE line buffering for partial chunks, JSON parsing per event
  - Parse streaming tokens and append to chat bubble in real-time with markdown rendering
  - Session management (store session_id in memory, pass back on follow-up messages)
  - Resume list: fetch from `/api/resumes`, render in sidebar, handle delete with confirmation
  - Markdown-to-HTML rendering via marked.js CDN (GFM, tables, breaks)
  - Toast notifications for success/error/warning/info feedback
  - Tool call indicators (animated spinner with tool name)
  - Mobile sidebar toggle with click-outside-to-close
- [x] Implement `static/css/style.css`:
  - Clean, professional HR-tool aesthetic with CSS variables design system
  - Responsive layout (sidebar collapses on mobile < 768px)
  - Chat bubble styling (user blue, assistant white with border)
  - Upload area styling (drag & drop zone with dragover state)
  - Typing indicator with bouncing dots animation
  - Streaming cursor (blinking caret on empty bubbles)
  - Full markdown content styling (tables, code blocks, blockquotes, lists)
  - Toast notification animations
  - Print styles
- [x] Update `docs-claude/webui-templates-index.md`

#### Phase 6 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Complete single-page frontend: index.html (Jinja2 template with sidebar+chat layout), style.css (~1045 lines with CSS variables design system, responsive layout, markdown styling), app.js (~790 lines with upload flow, SSE streaming chat, resume CRUD, notifications), webui-templates-index.md documentation |
| Were there any deviations from the plan? | Used `fetch` + `ReadableStream` instead of `EventSource` (POST not supported by EventSource). Used toast notifications instead of upload progress bars (simpler UX). Added file list with remove buttons before upload. Added position scope selector in chat input bar. Used marked.js CDN instead of custom regex for markdown. |
| Issues/blockers encountered? | HTML/JS ID mismatch: agents used different naming conventions (HTML kebab-case vs JS camelCase). Required manual harmonization pass to align all IDs. CSS had unused selectors from older HTML structure. |
| How were issues resolved? | Rewrote index.html to use camelCase IDs matching JS selectors. Code-simplifier cleaned up ~266 lines of dead CSS rules, fixed class name mismatches, and added missing `markdown-content` class to bubble elements. |
| Any technical debt introduced? | None. CDN dependency on marked.js (could be vendored for offline use). |
| Recommendations for next phase? | Phase 7 integration testing should verify: upload flow end-to-end, SSE streaming renders correctly, markdown tables/code blocks display properly, mobile responsive layout works, delete confirmation works, position tag filtering works in both sidebar and chat. |

**Completed by**: frontend-engineer (HTML, CSS, JS), code-simplifier (cleanup, consistency fixes)
**Date Completed**: 2026-02-20

#### Notes for Future Phases

- **Template**: Single Jinja2 template at `app/templates/index.html`
- **Static files**: CSS (`app/static/css/style.css`) and JS (`app/static/js/app.js`)
- **SSE handling**: Frontend uses `fetch` POST + `ReadableStream` for streaming chat
- **External CDN**: marked.js for markdown rendering
- **Documentation**: `docs-claude/webui-templates-index.md` lists all templates, assets, and DOM IDs
- **Key DOM IDs**: `dropZone`, `fileInput`, `fileList`, `positionTag`, `uploadBtn`, `resumeList`, `resumeCount`, `chatMessages`, `chatInput`, `sendBtn`, `newChatBtn`, `chatPositionTag`, `sidebar`, `sidebarToggle`

---

## Phase 7: Integration Testing & Polish

**Assigned to**: senior-backend-engineer, code-simplifier
**Date Started**: 2026-02-20
**Status**: [ ] Not Started | [ ] In Progress | [x] Completed

- [x] End-to-end test: upload 3-5 sample resumes (mix of PDF and DOCX)
- [x] Test chat flow: "List all candidates" - agent calls list_candidates tool, streams 49 tokens with candidate analysis
- [x] Verify streaming works smoothly (no buffering issues, tokens appear in real-time)
- [x] Test follow-up questions: "Tell me more about candidate #1's experience" - uses session history, retrieves full resume
- [x] Test position tag filtering: upload resumes with tags, query within a tag - verified upload with tag and filtered GET
- [x] Test edge cases:
  - Upload duplicate resume (allowed, separate entries)
  - Upload non-PDF/DOCX file (returns error in `errors` array: "Unsupported file type")
  - Empty chat message (returns HTTP 422 with validation error)
  - Whitespace-only chat message (returns HTTP 422)
  - Delete resume (returns 200, removes from DB + disk + chunks)
  - Invalid ObjectId format (returns HTTP 400)
  - Non-existent resume/session (returns HTTP 404)
- [x] Error handling review: proper error messages for all failure paths
- [x] Finalize `render.yaml` for deployment
- [ ] devops: deploy to Render and verify production works (deferred - requires user to set up Render service)

#### Phase 7 Completion Report

| Question | Response |
|----------|----------|
| What was implemented? | Full integration testing suite via curl/httpx. Fixed 7 bugs: (1) regex injection in get_candidate_resume tool, (2) .doc accepted in frontend but not backend, (3) empty chat message not validated, (4) position_tag empty string treated as filter, (5) critical streaming bug - no tokens produced due to ainvoke() not emitting stream events, (6) MongoDB null messages field safety, (7) removed dead code (nodes.py, state.py). Regenerated requirements.txt. |
| Were there any deviations from the plan? | Major deviation: rewrote agent/graph.py to use `create_react_agent` from LangGraph prebuilt instead of custom StateGraph with manual nodes. This was necessary because the custom `agent_node` using `ainvoke()` did not emit streaming events through `astream_events` or `astream(stream_mode="messages")`. Removed `agent/nodes.py` and `agent/state.py` (dead code after the rewrite). |
| Issues/blockers encountered? | Critical: SSE streaming produced only `session` + `done` events with zero token events. Root cause: `llm.ainvoke()` inside a custom graph node does not propagate `on_chat_model_stream` events to LangGraph's `astream_events`. This is a LangGraph architectural constraint - custom nodes that call `ainvoke()` are opaque to the event streaming system. |
| How were issues resolved? | Replaced the entire custom graph (StateGraph + agent_node + tool_node + should_continue) with `create_react_agent(model, tools, prompt)` from `langgraph.prebuilt`. This handles LLM invocation internally with proper streaming support. Switched `stream_agent()` from `astream_events(version="v2")` to `astream(stream_mode="messages")` which yields `AIMessageChunk` objects per token. |
| Any technical debt introduced? | The `position_tag` context from chat is no longer injected into the system prompt (was part of custom agent_node). The agent still works well without it since tools accept position_tag parameters. Could be re-added via the `prompt` parameter if needed. |
| Recommendations for next phase? | Deploy to Render via devops. Consider adding: (1) position_tag injection into system prompt for better context, (2) a health-check endpoint for Render, (3) rate limiting on upload/chat endpoints, (4) S3/GridFS for file storage in production (Render has ephemeral filesystem). |

**Completed by**: senior-backend-engineer (testing, bug fixes, graph rewrite), code-simplifier (refinement)
**Date Completed**: 2026-02-20

---

## API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serve single-page app (Jinja2 template) |
| POST | `/api/resumes/upload` | Upload multiple resumes (PDF/DOCX) with optional position_tag |
| GET | `/api/resumes` | List all uploaded resumes (optional ?position_tag= filter) |
| DELETE | `/api/resumes/{id}` | Delete a resume and its chunks |
| POST | `/api/chat` | SSE streaming chat with HR agent |
| GET | `/api/chat/sessions` | List chat sessions |
| DELETE | `/api/chat/sessions/{id}` | Delete a chat session |
| POST | `/api/search` | Debug: vector similarity search |

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `resumes` | Raw resume documents (text, metadata, file info) |
| `resume_chunks` | Chunked resume text with VoyageAI embeddings (vector indexed) |
| `chat_sessions` | Chat conversation history per session |

## Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │     Single Page App (HTML/JS)    │
                    │  ┌──────────┐  ┌──────────────┐ │
                    │  │  Upload   │  │  Chat (SSE)  │ │
                    │  │  Sidebar  │  │  Main Area   │ │
                    │  └────┬─────┘  └──────┬───────┘ │
                    └───────┼───────────────┼─────────┘
                            │               │
                    ┌───────▼───────────────▼─────────┐
                    │         FastAPI Backend           │
                    │  ┌──────────┐  ┌──────────────┐ │
                    │  │  Upload   │  │  Chat Router │ │
                    │  │  Router   │  │  (SSE Stream)│ │
                    │  └────┬─────┘  └──────┬───────┘ │
                    │       │               │          │
                    │  ┌────▼─────┐  ┌──────▼───────┐ │
                    │  │ Parser + │  │  LangGraph   │ │
                    │  │ Chunker  │  │  Agent       │ │
                    │  └────┬─────┘  │ ┌──────────┐ │ │
                    │       │        │ │ Retrieve  │ │ │
                    │  ┌────▼─────┐  │ │ Analyze   │ │ │
                    │  │ VoyageAI │  │ │ Rank      │ │ │
                    │  │ Embedder │  │ └──────────┘ │ │
                    │  └────┬─────┘  └──────┬───────┘ │
                    └───────┼───────────────┼─────────┘
                            │               │
                    ┌───────▼───────────────▼─────────┐
                    │       MongoDB Atlas              │
                    │  ┌──────────┐ ┌───────────────┐ │
                    │  │ resumes  │ │ resume_chunks  │ │
                    │  │          │ │ (vector index) │ │
                    │  └──────────┘ └───────────────┘ │
                    │  ┌──────────────────┐           │
                    │  │  chat_sessions   │           │
                    │  └──────────────────┘           │
                    └─────────────────────────────────┘
```
