from typing import List
from pydantic import BaseModel
from app.state import AgentState
from app.llm import llm
from app.events import emit_sync


class Report(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    limitations: List[str]


def report_agent(state: AgentState) -> AgentState:
    run_id = state.get("run_id")
    if run_id:
        emit_sync(run_id, {"type": "agent_started", "agent": "Report Agent"})

    prompt = f"""
Generate a JSON report with this schema:

title: string
summary: string
key_points: list of strings
limitations: list of strings

CONTENT:
{state['analysis_results']}
"""

    report = llm.invoke(prompt)

    if run_id:
        emit_sync(run_id, {"type": "agent_completed", "agent": "Report Agent"})

    return {
        **state,
        "final_report": report,
    }
