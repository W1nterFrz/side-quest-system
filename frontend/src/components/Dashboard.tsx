"use client";

import { useEffect, useState } from "react";
import type { ProgressStats } from "@/types";
import { api } from "@/lib/api";
import { Flame, CheckCircle2, CalendarCheck } from "lucide-react";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function Dashboard() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProgress(DEMO_USER_ID).then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map((i) => <span key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No data yet. Complete some tasks to see progress!</p>
      </div>
    );
  }

  const cards = [
    { label: "Completed", value: `${stats.completion_pct}%`, sub: `${stats.completed_tasks} / ${stats.total_tasks} tasks`, icon: CheckCircle2, accent: "var(--color-accent)" },
    { label: "Current streak", value: `${stats.current_streak}d`, sub: stats.current_streak > 0 ? "Keep it up!" : "Start today!", icon: Flame, accent: "#f97316" },
    { label: "Best streak", value: `${stats.longest_streak}d`, sub: "Personal record", icon: Flame, accent: "#eab308" },
    { label: "Today", value: `${stats.today_done}`, sub: stats.today_done > 0 ? "Nice work!" : "Get started", icon: CalendarCheck, accent: "#3b82f6" },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-3xl mx-auto w-full">
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Progress</h2>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <c.icon className="w-4 h-4 mb-2" style={{ color: c.accent }} />
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{c.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{c.label}</p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="card mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: "var(--text-secondary)" }}>Overall</span>
          <span style={{ color: "var(--color-accent)" }} className="font-medium">{stats.completion_pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-progress)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stats.completion_pct}%`, background: "linear-gradient(90deg, var(--color-accent), #22c55e)" }} />
        </div>
      </div>
      <h3 className="text-xs font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Recent activity</h3>
      <div className="space-y-1">
        {stats.recent_logs.slice(0,7).map((log) => (
          <div key={log.id} className="card !p-2.5 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{log.log_date}</span>
            <span className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>{log.tasks_done} tasks</span>
          </div>
        ))}
        {stats.recent_logs.length === 0 && <p className="text-xs text-center py-6" style={{ color: "var(--text-tertiary)" }}>No activity yet.</p>}
      </div>
    </div>
  );
}