from langchain.tools import tool
from duckduckgo_search import DDGS


@tool
def web_search(query: str) -> str:
    """
    Search the web for recent, factual information.
    Use this when up-to-date or external knowledge is required.
    """
    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=5):
            results.append(f"- {r['title']}: {r['body']}")
    return "\n".join(results)
