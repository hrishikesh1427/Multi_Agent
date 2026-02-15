from app.llm import llm
from app.tools import web_search
from app.state import AgentState
from app.events import emit_sync


def research_agent(state: AgentState) -> AgentState:
    """
    Research agent that uses web search to gather information.
    Emits execution events for real-time frontend visibility.
    """
    run_id = state.get("run_id")
    if run_id:
        emit_sync(run_id, {"type": "agent_started", "agent": "Research Agent"})

    user_query = state["user_query"]

    # Use the web search tool to gather information
    if run_id:
        emit_sync(run_id, {"type": "tool_called", "agent": "Research Agent", "tool": "web_search"})
    try:
        search_results = web_search.invoke(user_query)
    except Exception as e:
        search_results = f"Error performing search: {str(e)}"

    prompt = f"""You are a research agent. Analyze the following search results and provide concise research notes.

USER QUERY:
{user_query}

SEARCH RESULTS:
{search_results}

Provide a concise summary of the key findings, trends, and relevant information from the search results."""

    research_notes = llm.invoke(prompt)

    if run_id:
        emit_sync(run_id, {"type": "agent_completed", "agent": "Research Agent"})

    return {
        **state,
        "research_notes": research_notes,
    }
