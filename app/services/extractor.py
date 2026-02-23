"""Candidate info extraction from resume text.

Extracts name, email, and phone number using heuristics and regex patterns.
"""

import re

# Section headers that should NOT be treated as candidate names
_SECTION_HEADERS = {
    "summary", "objective", "experience", "education", "skills",
    "projects", "certifications", "references", "contact",
    "work experience", "professional experience", "technical skills",
    "profile", "about", "about me", "career objective",
    "qualifications", "achievements", "interests", "hobbies",
    "publications", "awards", "languages", "volunteer",
    "personal information", "personal details", "curriculum vitae",
    "resume", "cv",
}

_EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
_PHONE_PATTERN = re.compile(r'[\+]?[\d\s\-\(\)\.]{7,20}')


def _extract_name(text: str) -> str:
    """Extract candidate name from the first meaningful line of resume text.

    Heuristic: the first non-empty line is typically the candidate's name.
    Falls back to "Unknown Candidate" when the line looks like a section
    header, is outside a reasonable length, or is otherwise suspect.
    """
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        if len(stripped) < 2 or len(stripped) > 50:
            return "Unknown Candidate"

        if stripped.lower() in _SECTION_HEADERS:
            return "Unknown Candidate"

        return stripped

    return "Unknown Candidate"


def _extract_email(text: str) -> str | None:
    """Return the first email address found in the text, or None."""
    match = _EMAIL_PATTERN.search(text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> str | None:
    """Return the first phone number found in the text, or None.

    A match must contain at least 7 digit characters to be considered valid.
    """
    for match in _PHONE_PATTERN.finditer(text):
        candidate = match.group(0).strip()
        digit_count = sum(c.isdigit() for c in candidate)
        if digit_count >= 7:
            return candidate
    return None


def extract_candidate_info(text: str) -> dict:
    """Extract candidate name, email, and phone from resume text.

    Args:
        text: Plain text content of a resume.

    Returns:
        Dictionary with keys "name" (str), "email" (str | None),
        and "phone" (str | None).
    """
    return {
        "name": _extract_name(text),
        "email": _extract_email(text),
        "phone": _extract_phone(text),
    }
