"use client";

import { useState, useCallback } from "react";
import type { Pathway, Module as ModuleType, Task } from "@/types";
import { api } from "@/lib/api";
import { CheckCircle2, ChevronDown, ChevronRight, Target, Lock } from "lucide-react";

interface Props {
  pathway: Pathway | null;
  onPathwayUpdate?: (updated: Pathway) => void;
}

/** Determine lock status for a module based on its dependencies */
function isModuleLocked(mod: ModuleType, allModules: ModuleType[]): boolean {
  // First module (no sort-order predecessors) is always unlocked
  const prevInOrder = allModules.filter((m) => m.sort_order < mod.sort_order);
  if (prevInOrder.length === 0) return false;

  // Explicit depends_on gates
  if (mod.depends_on && mod.depends_on.length > 0) {
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));
    const depsMet = mod.depends_on.every((depId) => {
      const depMod = moduleMap.get(depId);
      return depMod && depMod.tasks.length > 0 && depMod.tasks.every((t) => t.completed);
    });
    if (!depsMet) return true;
  }

  // Sequential gate: prev module by sort_order must be complete
  const immediatePrev = prevInOrder.sort((a, b) => b.sort_order - a.sort_order)[0];
  if (immediatePrev && immediatePrev.tasks.length > 0) {
    const prevDone = immediatePrev.tasks.every((t) => t.completed);
    if (!prevDone) return true;
  }

  return false;
}

export default function PathwayView({ pathway, onPathwayUpdate }: Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [localPathway, setLocalPathway] = useState<Pathway | null>(pathway);
  const [animatingModules, setAnimatingModules] = useState<Set<string>>(new Set());

  if (pathway && pathway.id !== localPathway?.id) {
    setLocalPathway(pathway);
  }

  const toggleExpand = (modId: string) => {
    setExpandedModules((prev) => {
      const n = new Set(prev);
      n.has(modId) ? n.delete(modId) : n.add(modId);
      return n;
    });
  };

  const toggleTask = useCallback(
    async (task: Task, mod: ModuleType) => {
      if (!localPathway) return;
      const locked = isModuleLocked(mod, localPathway.modules);
      if (locked) return;

      try {
        const r = await api.toggleTask(task.id, !task.completed);
        const updated: Pathway = {
          ...localPathway,
          modules: localPathway.modules.map((m) =>
            m.id === mod.id
              ? {
                  ...m,
                  tasks: m.tasks.map((t) =>
                    t.id === task.id ? { ...t, completed: r.completed } : t
                  ),
                }
              : m
          ),
        };
        setLocalPathway(updated);

        // Trigger fade-in animation on newly unlocked modules
        const newlyUnlockedIds: string[] = [];
        updated.modules.forEach((m) => {
          const wasLocked = isModuleLocked(
            localPathway.modules.find((om) => om.id === m.id)!,
            localPathway.modules
          );
          const nowLocked = isModuleLocked(m, updated.modules);
          if (wasLocked && !nowLocked) {
            newlyUnlockedIds.push(m.id);
          }
        });

        if (newlyUnlockedIds.length > 0) {
          const animSet = new Set(newlyUnlockedIds);
          setAnimatingModules(animSet);
          setTimeout(() => setAnimatingModules(new Set()), 500);
        }

        onPathwayUpdate?.(updated);
      } catch (e) {
        console.error(e);
      }
    },
    [localPathway, onPathwayUpdate]
  );

  if (!localPathway) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--icon-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No pathway yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Start a new plan to generate your learning path.
          </p>
        </div>
      </div>
    );
  }

  const total = localPathway.modules.reduce((s, m) => s + m.tasks.length, 0);
  const done = localPathway.modules.reduce(
    (s, m) => s + m.tasks.filter((t) => t.completed).length,
    0
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-3xl mx-auto w-full">
      {/* Header card */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {localPathway.title}
        </h2>
        {localPathway.summary && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {localPathway.summary}
          </p>
        )}
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>Subject: {localPathway.subject || "-"}</span>
          <span>Level: {localPathway.goal_level}</span>
          <span>Duration: {localPathway.duration}</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: "var(--text-secondary)" }}>Progress</span>
            <span style={{ color: "var(--color-accent)" }} className="font-medium">
              {pct}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-progress)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "var(--color-accent)" }}
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            {done} / {total} tasks
          </p>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-1.5">
        {localPathway.modules
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((mod, i) => {
            const locked = isModuleLocked(mod, localPathway.modules);
            const modDone = mod.tasks.filter((t) => t.completed).length;
            const modTotal = mod.tasks.length;
            const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0;
            const isExpanded = expandedModules.has(mod.id);
            const isAnimating = animatingModules.has(mod.id);

            return (
              <div
                key={mod.id}
                className={`card !p-3 ${locked ? "" : ""} ${
                  isAnimating ? "module-fade-in" : ""
                }`}
                style={{
                  opacity: locked ? 0.55 : 1,
                  transition: "opacity 0.35s ease",
                }}
              >
                <button
                  onClick={() => toggleExpand(mod.id)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  {/* Module number / lock icon */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: locked
                        ? "var(--bg-progress)"
                        : "var(--color-accent-bg)",
                      color: locked ? "var(--text-tertiary)" : "var(--color-accent)",
                    }}
                  >
                    {locked ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : (
                      i + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-sm font-medium truncate"
                        style={{
                          color: locked
                            ? "var(--text-tertiary)"
                            : "var(--text-primary)",
                        }}
                      >
                        {mod.title}
                      </h3>
                      {/* Core / Extension badge */}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{
                          background: mod.is_core !== false
                            ? "var(--color-accent-bg)"
                            : "var(--bg-progress)",
                          color: mod.is_core !== false
                            ? "var(--color-accent)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {mod.is_core !== false ? "Core" : "Ext"}
                      </span>
                    </div>

                    {!locked && modTotal > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="flex-1 h-1 rounded-full max-w-[100px]"
                          style={{ background: "var(--bg-progress)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${modPct}%`,
                              background: "var(--color-accent)",
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {modDone}/{modTotal}
                        </span>
                      </div>
                    )}

                    {locked && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                        Complete previous module to unlock
                      </p>
                    )}
                  </div>

                  {isExpanded ? (
                    <ChevronDown
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: "var(--icon-muted)" }}
                    />
                  ) : (
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: "var(--icon-muted)" }}
                    />
                  )}
                </button>

                {/* Task list (expanded) */}
                {isExpanded && (
                  <div className="mt-2.5 pl-9 space-y-0.5">
                    {mod.tasks
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((task, taskIdx) => {
                        // Tasks within module also follow sequential lock
                        const taskLocked = locked;
                        return (
                          <label
                            key={task.id}
                            className={`flex items-center gap-2.5 py-1.5 rounded-md px-2 -mx-2 transition-colors ${
                              taskLocked ? "cursor-not-allowed" : "cursor-pointer group"
                            }`}
                            style={
                              taskLocked
                                ? {}
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (!taskLocked)
                                e.currentTarget.style.background = "var(--bg-card-hover)";
                            }}
                            onMouseLeave={(e) => {
                              if (!taskLocked)
                                e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {/* Checkbox */}
                            <div
                              onClick={() => {
                                if (!taskLocked) toggleTask(task, mod);
                              }}
                              className={`task-check ${
                                task.completed ? "checked" : ""
                              } ${taskLocked ? "task-check-locked" : ""}`}
                              style={
                                taskLocked
                                  ? {
                                      borderColor: "var(--text-tertiary)",
                                      opacity: 0.35,
                                      cursor: "not-allowed",
                                    }
                                  : {}
                              }
                            >
                              {task.completed && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </div>

                            {/* Task title */}
                            <span
                              className="text-sm flex-1"
                              style={{
                                color: task.completed
                                  ? "var(--text-tertiary)"
                                  : taskLocked
                                  ? "var(--text-tertiary)"
                                  : "var(--text-primary)",
                                textDecoration: task.completed
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {task.title}
                            </span>

                            {task.description && !taskLocked && (
                              <span
                                className="text-[11px] hidden group-hover:inline shrink-0"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {task.description}
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}