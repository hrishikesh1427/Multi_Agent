"""
FastAPI server that wraps the existing LangGraph multi-agent workflow.

Endpoints:
  POST /run          – kick off a new workflow, returns run_id
  GET  /events/{id}  – SSE stream of real-time execution events
  GET  /result/{id}  – final structured JSON report
"""

import asyncio
import json
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from langchain_core.messages import BaseMessage

from app.graph import build_graph
from app.events import register_run, get_queue, store_result, get_result, get_run, emit_sync

app = FastAPI(title="Multi-Agent Workflow API")

# Allow the React dev server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build the LangGraph workflow once at startup
workflow = build_graph()


# ── Request / Response models ────────────────────────────────────────

class RunRequest(BaseModel):
    query: str


class RunResponse(BaseModel):
    run_id: str


# ── Helpers ──────────────────────────────────────────────────────────

def _extract_text(value) -> str:
    """Pull plain text out of a LangChain message or raw string."""
    if isinstance(value, BaseMessage):
        content = value.content
    else:
        content = str(value)
    content = content.strip()
    if content.startswith("```"):
        content = content.replace("```json", "").replace("```", "").strip()
    return content


def _run_workflow(run_id: str, query: str) -> None:
    """Execute the LangGraph workflow synchronously (called via to_thread)."""
    state = {
        "user_query": query,
        "research_notes": None,
        "analysis_results": None,
        "final_report": None,
        "run_id": run_id,
    }

    result = workflow.invoke(state)

    # Parse the final report into JSON if possible
    raw = _extract_text(result.get("final_report", ""))
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = {"raw_output": raw}

    store_result(run_id, parsed)

    # Emit the final_report event so the SSE stream can deliver it
    emit_sync(run_id, {"type": "final_report", "data": parsed})

    # Sentinel: tells the SSE generator to close
    emit_sync(run_id, None)


# ── Endpoints ────────────────────────────────────────────────────────

@app.post("/run", response_model=RunResponse)
async def start_run(req: RunRequest):
    run_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    register_run(run_id, loop)

    # Run the (synchronous) LangGraph workflow in a background thread
    loop.run_in_executor(None, _run_workflow, run_id, req.query)

    return RunResponse(run_id=run_id)


@app.get("/events/{run_id}")
async def stream_events(run_id: str):
    q = get_queue(run_id)
    if q is None:
        raise HTTPException(404, detail="Run not found")

    async def event_generator():
        while True:
            event = await q.get()
            if event is None:  # sentinel – workflow finished
                break
            yield {"data": json.dumps(event)}

    return EventSourceResponse(event_generator())


@app.get("/result/{run_id}")
async def get_run_result(run_id: str):
    result = get_result(run_id)
    if result is None:
        run = get_run(run_id)
        if run is None:
            raise HTTPException(404, detail="Run not found")
        raise HTTPException(202, detail="Run still in progress")
    return result
