export type AgentStatus = "idle" | "running" | "completed";

export interface AgentInfo {
  name: string;
  status: AgentStatus;
  tool?: string; // currently-invoked tool, if any
}

export interface SSEEvent {
  type: "agent_started" | "agent_completed" | "tool_called" | "final_report";
  agent?: string;
  tool?: string;
  data?: Record<string, unknown>;
}
