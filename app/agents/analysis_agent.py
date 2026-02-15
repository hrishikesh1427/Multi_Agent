from app.state import AgentState
from app.llm import llm
from app.events import emit_sync


def analysis_agent(state: AgentState) -> AgentState:
    run_id = state.get("run_id")
    if run_id:
        emit_sync(run_id, {"type": "agent_started", "agent": "Analysis Agent"})

    prompt = f"""
You are a data analysis agent.

USER QUERY:
{state['user_query']}

RESEARCH NOTES:
{state['research_notes']}

Extract:
- key insights
- trends
- trade-offs
- implications

Be analytical, not verbose.
"""

    analysis = llm.invoke(prompt)

    if run_id:
        emit_sync(run_id, {"type": "agent_completed", "agent": "Analysis Agent"})

    return {
        **state,
        "analysis_results": analysis,
    }
