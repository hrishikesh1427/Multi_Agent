import type { AgentInfo } from "./types";

const statusStyles: Record<AgentInfo["status"], string> = {
  idle: "border-gray-300 bg-gray-100/50 dark:border-gray-600 dark:bg-gray-800/50",
  running:
    "border-blue-400 bg-blue-50 shadow-lg shadow-blue-500/10 dark:border-blue-500 dark:bg-blue-900/30 dark:shadow-blue-500/10",
  completed:
    "border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30",
};

export default function AgentCard({ agent }: { agent: AgentInfo }) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 transition-all duration-300 sm:p-5 ${statusStyles[agent.status]}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white sm:text-lg">
          {agent.name}
        </h3>
        <StatusBadge status={agent.status} />
      </div>

      {agent.tool && agent.status === "running" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
          Tool: <span className="font-mono">{agent.tool}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentInfo["status"] }) {
  if (status === "idle") {
    return (
      <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        Idle
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700 dark:bg-blue-800 dark:text-blue-200">
        <Spinner /> Running
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-800 dark:text-green-200">
      <Checkmark /> Completed
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function Checkmark() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
