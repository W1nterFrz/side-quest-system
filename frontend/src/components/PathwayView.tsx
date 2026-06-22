"use client";

import { useState } from "react";
import type { Pathway, Task } from "@/types";
import { api } from "@/lib/api";
import { CheckCircle2, ChevronDown, ChevronRight, Target } from "lucide-react";

interface Props { pathway: Pathway | null; }

export default function PathwayView({ pathway }: Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [localPathway, setLocalPathway] = useState<Pathway | null>(pathway);

  if (pathway && pathway.id !== localPathway?.id) { setLocalPathway(pathway); }

  const toggleExpand = (modId: string) => {
    setExpandedModules((prev) => { const n = new Set(prev); n.has(modId) ? n.delete(modId) : n.add(modId); return n; });
  };

  const toggleTask = async (task: Task) => {
    if (!localPathway) return;
    try {
      const r = await api.toggleTask(task.id, !task.completed);
      setLocalPathway({ ...localPathway, modules: localPathway.modules.map((m) => ({ ...m, tasks: m.tasks.map((t) => t.id === task.id ? { ...t, completed: r.completed } : t) })) });
    } catch (e) { console.error(e); }
  };

  if (!localPathway) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--icon-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No pathway yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Start a Quest to generate your learning path.</p>
        </div>
      </div>
    );
  }

  const total = localPathway.modules.reduce((s, m) => s + m.tasks.length, 0);
  const done = localPathway.modules.reduce((s, m) => s + m.tasks.filter((t) => t.completed).length, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-3xl mx-auto w-full">
      <div className="card mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{localPathway.title}</h2>
        {localPathway.summary && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{localPathway.summary}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span>Subject: {localPathway.subject || "-"}</span>
          <span>Level: {localPathway.goal_level}</span>
          <span>Duration: {localPathway.duration}</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: "var(--text-secondary)" }}>Progress</span>
            <span style={{ color: "var(--color-accent)" }} className="font-medium">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-progress)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>{done} / {total} tasks</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {localPathway.modules.map((mod, i) => {
          const modDone = mod.tasks.filter((t) => t.completed).length;
          const modTotal = mod.tasks.length;
          const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0;
          const isExpanded = expandedModules.has(mod.id);
          return (
            <div key={mod.id} className="card !p-3">
              <button onClick={() => toggleExpand(mod.id)} className="w-full flex items-center gap-3 text-left">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{mod.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 rounded-full max-w-[100px]" style={{ background: "var(--bg-progress)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${modPct}%`, background: "var(--color-accent)" }} />
                    </div>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{modDone}/{modTotal}</span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--icon-muted)" }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--icon-muted)" }} />}
              </button>

              {isExpanded && (
                <div className="mt-2.5 pl-9 space-y-0.5">
                  {mod.tasks.map((task) => (
                    <label key={task.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group rounded-md px-2 -mx-2 transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <div onClick={() => toggleTask(task)} className={`task-check ${task.completed ? "checked" : ""}`}>
                        {task.completed && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className="text-sm flex-1" style={{ color: task.completed ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                      {task.description && <span className="text-[11px] hidden group-hover:inline shrink-0" style={{ color: "var(--text-tertiary)" }}>{task.description}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}