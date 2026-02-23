"""LangGraph agent graph for the HR Resume Agent.

Uses ``create_react_agent`` from LangGraph prebuilt to build a ReAct agent
with proper streaming support. The agent uses Claude as the LLM with
three tools: search_resumes, get_candidate_resume, and list_candidates.

Public API
----------
    get_graph()      -- Module-level cached accessor (compile once).
    run_agent()      -- Convenience async function to invoke the graph.
    stream_agent()   -- Async generator yielding SSE-friendly token events.
"""

import logging
from typing import AsyncGenerator, Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage
from langgraph.prebuilt import create_react_agent

from app.agent.tools import agent_tools
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are an expert HR recruitment assistant. Your job is to analyze resumes \
and find the best candidates for a given role.

You have access to a database of candidate resumes. Use your tools to:
1. Search for relevant candidates using search_resumes
2. Retrieve full resumes using get_candidate_resume
3. List available candidates using list_candidates

When analyzing candidates, provide:
- A fit score (1-10) for each candidate
- Key strengths that match the role
- Gaps or areas of concern
- An overall ranking with justification

Be thorough and specific in your analysis. Reference specific experience, \
skills, and qualifications from the resumes."""

# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

_compiled_graph = None


def _get_llm() -> ChatAnthropic:
    """Return a ChatAnthropic instance configured for the HR agent."""
    return ChatAnthropic(
        model="claude-sonnet-4-5-20250929",
        anthropic_api_key=settings.anthropic_api_key,
        streaming=True,
        max_tokens=4096,
    )


def get_graph():
    """Return a module-level cached compiled graph.

    Uses ``create_react_agent`` which properly supports streaming events
    through ``astream_events`` and ``astream(stream_mode="messages")``.
    """
    global _compiled_graph
    if _compiled_graph is None:
        llm = _get_llm()
        _compiled_graph = create_react_agent(
            model=llm,
            tools=agent_tools,
            prompt=SYSTEM_PROMPT,
        )
        logger.info("HR Resume Agent graph compiled successfully.")
    return _compiled_graph


# ---------------------------------------------------------------------------
# Convenience runners
# ---------------------------------------------------------------------------


def _build_messages(
    message: str,
    history: Optional[list] = None,
) -> list:
    """Build message list from history and new message."""
    messages: list = []

    if history:
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=message))
    return messages


async def run_agent(
    message: str,
    role_description: str = "",
    top_k: int = 10,
    position_tag: str = "",
    history: Optional[list] = None,
) -> dict:
    """Invoke the HR Resume Agent graph and return the final state."""
    graph = get_graph()
    messages = _build_messages(message, history)

    logger.info("run_agent: invoking graph with %d message(s)", len(messages))

    final_state = await graph.ainvoke({"messages": messages})

    logger.info(
        "run_agent: graph completed with %d total message(s)",
        len(final_state.get("messages", [])),
    )

    return final_state


def _extract_text(content) -> str:
    """Extract text from AIMessageChunk content.

    Handles both string content and Anthropic's list-of-blocks format.
    """
    if isinstance(content, str):
        return content

    if not isinstance(content, list):
        return ""

    parts: list[str] = []
    for block in content:
        if isinstance(block, dict):
            text = block.get("text", "")
        elif isinstance(block, str):
            text = block
        else:
            continue
        if text:
            parts.append(text)
    return "".join(parts)


def _get_field(obj, key: str):
    """Read a field from a dict or object attribute, returning None if missing."""
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


async def stream_agent(
    message: str,
    role_description: str = "",
    top_k: int = 10,
    position_tag: str = "",
    history: Optional[list] = None,
) -> AsyncGenerator[dict, None]:
    """Stream the HR Resume Agent graph, yielding SSE-friendly event dicts.

    Uses ``graph.astream(stream_mode="messages")`` for per-token streaming.

    Yields:
        - ``{"type": "token", "content": "..."}`` for each LLM output token.
        - ``{"type": "tool_call", "name": "...", "args": {...}}`` when the
          LLM initiates a tool call.
        - ``{"type": "done"}`` when the graph finishes.
    """
    graph = get_graph()
    messages = _build_messages(message, history)

    logger.info(
        "stream_agent: starting streaming with %d message(s)", len(messages)
    )

    emitted_tool_calls: set[str] = set()

    try:
        async for msg, metadata in graph.astream(
            {"messages": messages}, stream_mode="messages"
        ):
            if not isinstance(msg, AIMessageChunk):
                continue

            # Extract text tokens
            text = _extract_text(msg.content)
            if text:
                yield {"type": "token", "content": text}

            # Extract tool calls (deduplicated)
            for tc in msg.tool_call_chunks or []:
                tc_id = _get_field(tc, "id")
                tc_name = _get_field(tc, "name")
                if tc_id and tc_name and tc_id not in emitted_tool_calls:
                    emitted_tool_calls.add(tc_id)
                    yield {"type": "tool_call", "name": tc_name, "args": {}}

    except Exception as exc:
        logger.error("stream_agent: error during streaming: %s", exc)
        yield {"type": "error", "content": str(exc)}

    yield {"type": "done"}
    logger.info("stream_agent: streaming completed.")
