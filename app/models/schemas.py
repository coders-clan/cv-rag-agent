from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator


class CandidateInfo(BaseModel):
    """Extracted candidate information from resume text."""

    name: str
    email: str | None = None
    phone: str | None = None


class ResumeChunk(BaseModel):
    """A chunked section of a resume for vector storage."""

    text: str
    section_type: str  # experience, education, skills, summary, projects, certifications, other
    chunk_index: int
    candidate_name: str
    file_name: str
    position_tag: str | None = None


class ResumeDocument(BaseModel):
    """Resume document stored in MongoDB resumes collection."""

    candidate_name: str
    file_name: str
    raw_text: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    position_tag: str | None = None
    sections_count: int = 0
    file_path: str | None = None
    embedding_status: str = "pending"


class ResumeUploadResponse(BaseModel):
    """API response returned after a successful resume upload."""

    id: str
    candidate_name: str
    file_name: str
    sections_count: int
    position_tag: str | None = None
    embedding_status: str = "processing"


class ResumeListItem(BaseModel):
    """Item schema for GET /api/resumes list endpoint."""

    id: str
    candidate_name: str
    file_name: str
    upload_date: datetime
    position_tag: str | None = None
    sections_count: int


class UploadBatchResponse(BaseModel):
    """Response for multi-file upload endpoint."""

    uploaded: list[ResumeUploadResponse]
    errors: list[dict]  # each dict contains file_name and error message


class SearchRequest(BaseModel):
    """Request body for the POST /api/search endpoint."""

    query: str
    top_k: int = 5
    position_tag: str | None = None


class SearchResult(BaseModel):
    """Single result item returned by the search endpoint."""

    text: str
    candidate_name: str
    section_type: str
    file_name: str
    position_tag: str | None = None
    resume_id: str
    score: float


class ChatRequest(BaseModel):
    """Request body for the POST /api/chat SSE endpoint."""

    message: str
    session_id: str | None = None
    position_tag: str | None = None

    @field_validator("message")
    @classmethod
    def message_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message must not be empty")
        return v


class ChatSessionItem(BaseModel):
    """Item schema for GET /api/chat/sessions list endpoint."""

    id: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    position_tag: str | None = None
