from app.graph import build_graph
import time


def test_multi_agent_pipeline():
    app = build_graph()

    start = time.time()
    result = app.invoke({
        "user_query": "Advantages of multi-agent systems in AI",
        "research_notes": None,
        "analysis_results": None,
        "final_report": None,
    })
    latency = time.time() - start

    assert result["final_report"] is not None
    assert latency < 90
