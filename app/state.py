from typing import Optional, TypedDict


class AgentState(TypedDict):
    user_query: str
    research_notes: Optional[str]
    analysis_results: Optional[str]
    final_report: Optional[str]
    # run_id is threaded through state so agents can emit SSE events
    run_id: Optional[str]
