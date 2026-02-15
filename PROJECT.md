# Multi-Agent AI Workflow

A production-grade multi-agent AI system built with **LangGraph**, **FastAPI**, and **HuggingFace LLMs**. Three specialized agents are orchestrated in sequence — Research, Analysis, and Report — with real-time execution visibility via Server-Sent Events (SSE).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   FastAPI Server                     │
│                  (app/server.py)                     │
│                                                     │
│  POST /run ──► spawn workflow in background thread   │
│  GET /events/{run_id} ──► SSE stream of events      │
│  GET /result/{run_id} ──► final JSON report          │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              LangGraph State Machine                 │
│                 (app/graph.py)                        │
│                                                     │
│  Entry ──► Research ──► Analysis ──► Report ──► End  │
└──────────────┬──────────────┬──────────────┬────────┘
               │              │              │
               ▼              ▼              ▼
         Research Agent  Analysis Agent  Report Agent
         (tool calling)   (reasoning)    (structured output)
```

---

## Agent Pipeline

The system runs three agents **sequentially** via a LangGraph `StateGraph`. Each agent reads from and writes to a shared `AgentState` dictionary.

### 1. Research Agent (`app/agents/research_agent.py`)

- **Role**: Gathers external information relevant to the user's query.
- **Tool**: `web_search` — performs a live DuckDuckGo search (`duckduckgo-search` library) and returns the top 5 results.
- **LLM call**: Summarizes the raw search results into concise research notes.
- **Output**: Writes `research_notes` to state.

### 2. Analysis Agent (`app/agents/analysis_agent.py`)

- **Role**: Performs deeper reasoning over the research notes.
- **Input**: Reads `user_query` and `research_notes` from state.
- **LLM call**: Extracts key insights, trends, trade-offs, and implications.
- **Output**: Writes `analysis_results` to state.

### 3. Report Agent (`app/agents/report_agent.py`)

- **Role**: Produces a structured final report.
- **Input**: Reads `analysis_results` from state.
- **LLM call**: Generates a JSON report matching the `Report` schema:
  ```json
  {
    "title": "string",
    "summary": "string",
    "key_points": ["string"],
    "limitations": ["string"]
  }
  ```
- **Output**: Writes `final_report` to state.

---

## Shared State

Defined in `app/state.py`:

| Field              | Type            | Set By          |
|--------------------|-----------------|-----------------|
| `user_query`       | `str`           | API caller      |
| `research_notes`   | `Optional[str]` | Research Agent   |
| `analysis_results` | `Optional[str]` | Analysis Agent   |
| `final_report`     | `Optional[str]` | Report Agent     |
| `run_id`           | `Optional[str]` | API server       |

The `run_id` field is threaded through state so that each agent can emit execution events back to the SSE stream without any global mutable state.

---

## LLM Configuration (`app/llm.py`)

- **Provider**: HuggingFace Inference API
- **Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct`
- **Auth**: `HUGGINGFACEHUB_API_TOKEN` from `.env`
- **Wrapper**: `ChatHuggingFace` for proper chat-format message handling

---

## Tools (`app/tools.py`)

| Tool         | Description                                  |
|--------------|----------------------------------------------|
| `web_search` | Live DuckDuckGo search, returns top 5 results. Decorated with `@tool` for LangChain compatibility. |

---

## Real-Time Event System (`app/events.py`)

Each workflow run gets its own `asyncio.Queue`. Agents push structured events into the queue from their synchronous execution thread using `emit_sync()`, which calls `loop.call_soon_threadsafe()` to safely cross the sync/async boundary.

**Event types emitted:**

| Event             | When                                  |
|-------------------|---------------------------------------|
| `agent_started`   | An agent begins execution             |
| `tool_called`     | An agent invokes an external tool     |
| `agent_completed` | An agent finishes execution           |
| `final_report`    | The full pipeline is done, includes report data |

Events are **high-level execution signals only** — no chain-of-thought or internal prompts are exposed.

---

## API Endpoints (`app/server.py`)

### `POST /run`

Starts a new workflow run.

**Request:**
```json
{ "query": "Analyze current trends in multi-agent AI systems" }
```

**Response:**
```json
{ "run_id": "550e8400-e29b-41d4-a716-446655440000" }
```

The workflow runs in a background thread. The response is immediate.

### `GET /events/{run_id}`

Server-Sent Events stream. Each event is a JSON object:

```
data: {"type": "agent_started", "agent": "Research Agent"}
data: {"type": "tool_called", "agent": "Research Agent", "tool": "web_search"}
data: {"type": "agent_completed", "agent": "Research Agent"}
data: {"type": "agent_started", "agent": "Analysis Agent"}
data: {"type": "agent_completed", "agent": "Analysis Agent"}
data: {"type": "agent_started", "agent": "Report Agent"}
data: {"type": "agent_completed", "agent": "Report Agent"}
data: {"type": "final_report", "data": {...}}
```

The stream closes after `final_report`.

### `GET /result/{run_id}`

Returns the final JSON report. Returns `202` if the run is still in progress, `404` if the run doesn't exist.

---

## Concurrency

- Each run is identified by a UUID (`run_id`).
- Run state (event queues, results) is stored in in-memory dictionaries.
- Multiple runs can execute concurrently — each gets its own queue and background thread.

---

## How to Run

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend only)
- A HuggingFace API token in `.env`:
  ```
  HUGGINGFACEHUB_API_TOKEN=hf_your_token_here
  ```

### Backend

```bash
# From the project root

# Create virtual environment (if not already done)
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn app.server:app --reload --port 8000
```

The API is now available at `http://localhost:8000`. You can test it directly:

```bash
# Start a run
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"query": "Latest trends in AI agents"}'

# Stream events (replace with actual run_id)
curl http://localhost:8000/events/<run_id>

# Get final report
curl http://localhost:8000/result/<run_id>
```

### Frontend (optional visualization)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies API calls to the backend on port 8000.

---

## File Reference

```
app/
├── server.py              # FastAPI server — API endpoints, SSE streaming
├── graph.py               # LangGraph StateGraph — wires agents in sequence
├── state.py               # AgentState TypedDict — shared state schema
├── events.py              # Event queue system — thread-safe SSE emission
├── llm.py                 # HuggingFace LLM initialization
├── tools.py               # web_search tool (DuckDuckGo)
├── main.py                # CLI entry point (standalone, no server)
└── agents/
    ├── research_agent.py  # Web search + summarization
    ├── analysis_agent.py  # Insight extraction
    ├── report_agent.py    # Structured JSON report generation
    └── supervisor.py      # Routing logic (used by graph alternatives)
```
