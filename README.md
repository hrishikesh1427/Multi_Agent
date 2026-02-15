# Multi-Agent AI Workflow System

Production-grade multi-agent system built with LangGraph, FastAPI, and a React frontend. Three specialized agents (Research, Analysis, Report) run in sequence with real-time execution visibility via Server-Sent Events.

## Features

- **Three-agent pipeline** &mdash; Research (web search + summarization), Analysis (insight extraction), Report (structured JSON output)
- **Real-time streaming** &mdash; SSE-based live agent status updates in the browser
- **HuggingFace LLMs** &mdash; Meta-Llama-3.1-8B-Instruct via Inference API
- **Tool calling** &mdash; DuckDuckGo web search integrated with LangChain `@tool`
- **Structured output** &mdash; Pydantic-validated JSON reports
- **React frontend** &mdash; Agent status cards, dark mode, responsive layout
- **Concurrent runs** &mdash; Per-run event queues with thread-safe async bridging

## Architecture

```
User Query
  ↓
[Research Agent] → DuckDuckGo search → LLM summary → research_notes
  ↓
[Analysis Agent] → LLM reasoning → analysis_results
  ↓
[Report Agent]   → LLM generation → final_report (JSON)
```

All agents share an `AgentState` TypedDict and are orchestrated as a LangGraph `StateGraph`.

## Project Structure

```
app/
├── server.py          # FastAPI server (POST /run, GET /events/{id}, GET /result/{id})
├── main.py            # CLI entry point
├── graph.py           # LangGraph StateGraph wiring
├── state.py           # AgentState TypedDict
├── events.py          # Per-run event queue system
├── llm.py             # HuggingFace LLM config
├── tools.py           # DuckDuckGo web_search tool
└── agents/
    ├── research_agent.py
    ├── analysis_agent.py
    ├── report_agent.py
    └── supervisor.py
frontend/              # React 19 + TypeScript + Vite + Tailwind CSS
tests/
└── test_workflow.py   # End-to-end pipeline test
```

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [HuggingFace API token](https://huggingface.co/settings/tokens)

### Backend

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
HUGGINGFACEHUB_API_TOKEN=your_token
```

Start the API server:

```bash
uvicorn app.server:app --reload --port 8000
```

Or run from the CLI without the server:

```bash
python app/main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API calls to port 8000.

## API Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/run`            | Start a workflow run, returns run ID |
| GET    | `/events/{run_id}`| SSE stream of agent execution events |
| GET    | `/result/{run_id}`| Final JSON report (200/202/404)      |

## Testing

```bash
pytest tests/
```

## License

See [LICENSE](LICENSE).
