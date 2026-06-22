import type { ChatRequest, ChatResponse, Pathway, ProgressStats, QuestSummary, UserProfile } from "@/types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) { const err = await res.text(); throw new Error(err || `HTTP ${res.status}`); }
  return res.json();
}

export const api = {
  chat: (data: ChatRequest) => request<ChatResponse>(`${BASE}/agent/chat`, { method: "POST", body: JSON.stringify(data) }),
  getPathway: (idOrSlug: string) => request<Pathway>(`${BASE}/pathways/${idOrSlug}`),
  listPathways: (userId: string) => request<QuestSummary[]>(`${BASE}/pathways/user/${userId}`),
  toggleTask: (taskId: string, completed: boolean) => request<{ completed: boolean }>(`${BASE}/pathways/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ completed }) }),
  getProgress: (userId: string) => request<ProgressStats>(`${BASE}/progress/${userId}`),
  createUser: (profile: UserProfile) => request<UserProfile>(`${BASE}/users/`, { method: "POST", body: JSON.stringify(profile) }),
};