# HR Resume Agent

AI-powered HR agent for uploading resumes and finding top candidates via conversational chat.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) package manager
- MongoDB Atlas account

## Setup

```bash
# Install dependencies
uv sync

# Copy env file and fill in your credentials
cp .env.example .env
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VOYAGE_API_KEY` | VoyageAI API key for embeddings |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `ATLAS_CONNECTION_STRING` | MongoDB Atlas connection string |

## Run

```bash
# Development (with hot reload)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or via python
uv run python -m app.main
```

The app will be available at `http://localhost:8000`.
