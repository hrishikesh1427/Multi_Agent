from app.state import AgentState


def supervisor(state: AgentState) -> str:
    if not state.get("research_notes"):
        return "research"
    if not state.get("analysis_results"):
        return "analysis"
    if not state.get("final_report"):
        return "report"
    return "__end__"
