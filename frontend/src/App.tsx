import { useCallback, useEffect, useRef, useState } from "react";
import AgentCard from "./AgentCard";
import type { AgentInfo, SSEEvent } from "./types";

const INITIAL_AGENTS: AgentInfo[] = [
  { name: "Research Agent", status: "idle" },
  { name: "Analysis Agent", status: "idle" },
  { name: "Report Agent", status: "idle" },
];

/* ─── JSON extraction helper ─── */
function extractFirstJSON(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") depth--;
    if (depth === 0) {
      try {
        return JSON.parse(raw.substring(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/* ─── Theme helpers ─── */
function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export default function App() {
  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState(
    "Analyze current trends in multi-agent AI systems"
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [rawExpanded, setRawExpanded] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  const updateAgent = useCallback(
    (name: string, patch: Partial<AgentInfo>) => {
      setAgents((prev) =>
        prev.map((a) => (a.name === name ? { ...a, ...patch } : a))
      );
    },
    []
  );

  const handleRun = useCallback(async () => {
    setAgents(INITIAL_AGENTS);
    setReport(null);
    setError(null);
    setRunning(true);
    setRawExpanded(false);

    eventSourceRef.current?.close();

    try {
      const res = await fetch("/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error(`POST /run failed: ${res.status}`);

      const { run_id } = await res.json();

      const es = new EventSource(`/events/${run_id}`);
      eventSourceRef.current = es;

      es.onmessage = (ev) => {
        const event: SSEEvent = JSON.parse(ev.data);

        switch (event.type) {
          case "agent_started":
            updateAgent(event.agent!, { status: "running", tool: undefined });
            break;
          case "tool_called":
            updateAgent(event.agent!, { tool: event.tool });
            break;
          case "agent_completed":
            updateAgent(event.agent!, { status: "completed", tool: undefined });
            break;
          case "final_report":
            setReport(event.data ?? null);
            setRunning(false);
            es.close();
            break;
        }
      };

      es.onerror = () => {
        es.close();
        setRunning(false);
        setError("SSE connection lost. Check if the backend is running.");
      };
    } catch (err: unknown) {
      setRunning(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [query, updateAgent]);

  // Extract structured data from report
  const rawOutput =
    report && typeof report.raw_output === "string"
      ? (report.raw_output as string)
      : report
        ? JSON.stringify(report, null, 2)
        : null;

  const structured = rawOutput ? extractFirstJSON(rawOutput) : null;

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      {/* Header — sticky top */}
      <header className="shrink-0 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
              Multi-Agent Workflow Visualizer
            </h1>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:mt-1 sm:text-sm">
              Real-time execution of a LangGraph multi-agent pipeline
            </p>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="shrink-0 rounded-lg border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Query input bar — sticky below header */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-950 sm:px-6 sm:py-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={running}
            placeholder="Enter a research query..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
          <div className="flex items-center gap-2.5">
            {/* LLM Badge — single responsive element */}
            <span className="whitespace-nowrap rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <span className="sm:hidden">LLM: Llama-3.1-8B</span>
              <span className="hidden sm:inline">LLM: Meta-Llama-3.1-8B-Instruct</span>
            </span>
            <button
              onClick={handleRun}
              disabled={running || !query.trim()}
              className="w-full whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5"
            >
              {running ? "Running..." : "Run Multi-Agent Workflow"}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 mx-4 mt-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 sm:mx-6 sm:mt-3">
          {error}
        </div>
      )}

      {/* Main scrollable content area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* LEFT: Agent Execution Panel */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/50 sm:gap-4 sm:p-6 lg:w-1/2 lg:shrink lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-gray-200 dark:lg:border-gray-800">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 sm:text-lg">
            Multi-Agent Execution
          </h2>
          {agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>

        {/* RIGHT: Final Output Panel */}
        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:w-1/2 lg:overflow-y-auto">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 sm:text-lg">
            Final Output
          </h2>

          {report ? (
            <div className="mt-3 flex flex-1 flex-col gap-3 sm:mt-4 sm:gap-4">
              {/* Structured Report */}
              <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200 sm:text-base">
                  Structured Report
                </h3>
                {structured ? (
                  <div className="space-y-3 text-sm sm:space-y-4">
                    {/* Title */}
                    {structured.title && (
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                        {String(structured.title)}
                      </h4>
                    )}
                    {/* Summary */}
                    {structured.summary && (
                      <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                        {String(structured.summary)}
                      </p>
                    )}
                    {/* Key Points */}
                    {Array.isArray(structured.key_points) &&
                      structured.key_points.length > 0 && (
                        <div>
                          <h5 className="mb-1.5 font-semibold text-gray-700 dark:text-gray-300 sm:mb-2">
                            Key Points
                          </h5>
                          <ul className="list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
                            {(structured.key_points as string[]).map(
                              (pt, i) => (
                                <li key={i}>{pt}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {/* Limitations */}
                    {Array.isArray(structured.limitations) &&
                      structured.limitations.length > 0 && (
                        <div>
                          <h5 className="mb-1.5 font-semibold text-gray-700 dark:text-gray-300 sm:mb-2">
                            Limitations
                          </h5>
                          <ul className="list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
                            {(structured.limitations as string[]).map(
                              (lim, i) => (
                                <li key={i}>{lim}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-500 dark:text-gray-400">
                    Unable to parse structured report. Showing raw output
                    instead.
                  </p>
                )}
              </section>

              {/* Raw Model Output — collapsible */}
              <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setRawExpanded((v) => !v)}
                  className="flex w-full items-center justify-between bg-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:px-5 sm:py-3"
                >
                  Raw Model Output
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${rawExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {rawExpanded && (
                  <pre className="max-h-96 overflow-auto bg-white p-4 font-mono text-xs leading-relaxed text-gray-800 dark:bg-gray-900 dark:text-green-300 sm:p-5">
                    {rawOutput}
                  </pre>
                )}
              </section>
            </div>
          ) : (
            <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:mt-4">
              {running
                ? "Waiting for agents to complete..."
                : "Run the workflow to see results here"}
            </div>
          )}
        </div>
      </main>

      {/* Footer — sticky bottom */}
      <footer className="shrink-0 border-t border-gray-200 bg-white/80 px-4 py-2.5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Built by Hrishikesh Vastrad</span>
          <a
            href="https://www.linkedin.com/in/hrishikesh-vastrad-a75436255"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="transition hover:opacity-80"
          >
            <svg className="h-4 w-4" fill="#0A66C2" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
