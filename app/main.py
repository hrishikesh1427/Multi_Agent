from app.graph import build_graph
import json
from langchain_core.messages import BaseMessage

if __name__ == "__main__":
    app = build_graph()

    state = {
        "user_query": "Analyze current trends in multi-agent AI systems",
        "research_notes": None,
        "analysis_results": None,
        "final_report": None,
    }

    result = app.invoke(state)

    print("\n===== FINAL REPORT =====\n")

    final_report = result["final_report"]

    # 1. Extract content if this is a LangChain message object
    if isinstance(final_report, BaseMessage):
        content = final_report.content
    else:
        content = final_report

    # 2. Clean whitespace
    content = content.strip()

    # 3. Remove markdown code fences if present
    if content.startswith("```"):
        content = content.replace("```json", "").replace("```", "").strip()

    # 4. Try to pretty-print JSON
    try:
        parsed = json.loads(content)
        print(json.dumps(parsed, indent=2))
    except Exception:
        # Fallback: print raw content
        print(content)
