import type { ChatRequest, ChatResponse, Pathway, ProgressStats, QuestSummary, UserProfile } from "@/types";

const BASE = "/api";
const CHAT_TIMEOUT_MS = 120_000; // 120s — generous timeout for LLM + DB pipeline

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

async function requestWithTimeout<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  chat: (data: ChatRequest) =>
    requestWithTimeout<ChatResponse>(`${BASE}/agent/chat`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPathway: (idOrSlug: string) => request<Pathway>(`${BASE}/pathways/${idOrSlug}`),
  listPathways: (userId: string) => request<QuestSummary[]>(`${BASE}/pathways/user/${userId}`),
  toggleTask: (taskId: string, completed: boolean) =>
    request<{ completed: boolean }>(`${BASE}/pathways/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
  getProgress: (userId: string) => request<ProgressStats>(`${BASE}/progress/${userId}`),
  createUser: (profile: UserProfile) =>
    request<UserProfile>(`${BASE}/users/`, {
      method: "POST",
      body: JSON.stringify(profile),
    }),
};