from langgraph.graph import StateGraph
from app.state import AgentState
from app.agents.research_agent import research_agent
from app.agents.analysis_agent import analysis_agent
from app.agents.report_agent import report_agent


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("research", research_agent)
    graph.add_node("analysis", analysis_agent)
    graph.add_node("report", report_agent)

    graph.set_entry_point("research")

    graph.add_edge("research", "analysis")
    graph.add_edge("analysis", "report")
    graph.add_edge("report", "__end__")

    return graph.compile()
