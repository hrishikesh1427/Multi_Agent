"""
Event emitter for tracking multi-agent execution.

Each run gets its own asyncio.Queue. Agents push structured events
into the queue; the SSE endpoint reads from it.
"""

import asyncio
import json
import time
from typing import Any, Dict

# run_id -> asyncio.Queue of JSON-serializable event dicts
_queues: Dict[str, asyncio.Queue] = {}

# run_id -> final result dict (populated when workflow completes)
_results: Dict[str, Any] = {}

# run_id -> run metadata
_runs: Dict[str, Dict[str, Any]] = {}

# run_id -> event loop reference (stored when registering the run)
_loops: Dict[str, asyncio.AbstractEventLoop] = {}


def register_run(run_id: str, loop: asyncio.AbstractEventLoop) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _queues[run_id] = q
    _loops[run_id] = loop
    _runs[run_id] = {"status": "running", "started_at": time.time()}
    return q


def get_queue(run_id: str) -> asyncio.Queue | None:
    return _queues.get(run_id)


def store_result(run_id: str, result: Any) -> None:
    _results[run_id] = result
    if run_id in _runs:
        _runs[run_id]["status"] = "completed"


def get_result(run_id: str) -> Any | None:
    return _results.get(run_id)


def get_run(run_id: str) -> Dict[str, Any] | None:
    return _runs.get(run_id)


def emit_sync(run_id: str, event: Dict[str, Any]) -> None:
    """Push an event from a synchronous (non-async) agent function.

    Because agents run inside a thread (via executor),
    we need to reach into the event-loop that owns the queue.
    """
    q = _queues.get(run_id)
    loop = _loops.get(run_id)
    if q is None or loop is None:
        return
    loop.call_soon_threadsafe(q.put_nowait, event)
