export interface UserProfile {
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  time_budget: "casual" | "moderate" | "intensive";
  style: "structured" | "exploratory" | "project_based";
}

export interface QuestSummary {
  id: string;
  slug: string;
  title: string;
  subject: string;
  goal_level: string;
  duration: string;
  summary: string | null;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
}

export interface Task {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
}

export interface Module {
  id: string;
  pathway_id: string;
  title: string;
  sort_order: number;
  tasks: Task[];
}

export interface Pathway {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  subject: string;
  goal_level: string;
  duration: string;
  summary: string | null;
  created_at: string;
  modules: Module[];
}

export type AgentPhase = "goal_clarifier" | "pathway_planner" | "task_quantifier";

export interface ChatRequest {
  conversation_id?: string | null;
  agent: AgentPhase;
  message: string;
  user_profile?: UserProfile | null;
}

export interface ChatResponse {
  conversation_id: string;
  agent: string;
  reply: string;
  pathway: Pathway | null;
}

export interface ProgressStats {
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
  current_streak: number;
  longest_streak: number;
  today_done: number;
  recent_logs: { id: string; log_date: string; tasks_done: number }[];
}