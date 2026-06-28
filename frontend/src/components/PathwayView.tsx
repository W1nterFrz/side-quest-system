"use client";

import { useState, useCallback } from "react";
import type { Pathway, Module as ModuleType, Task } from "@/types";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight, Target, Lock } from "lucide-react";

interface Props {
  pathway: Pathway | null;
  onPathwayUpdate?: (updated: Pathway) => void;
}

function isModuleLocked(mod: ModuleType, allModules: ModuleType[]): boolean {
  const prevInOrder = allModules.filter((m) => m.sort_order < mod.sort_order);
  if (prevInOrder.length === 0) return false;

  if (mod.depends_on && mod.depends_on.length > 0) {
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));
    const depsMet = mod.depends_on.every((depId) => {
      const depMod = moduleMap.get(depId);
      return depMod && depMod.tasks.length > 0 && depMod.tasks.every((t) => t.completed);
    });
    if (!depsMet) return true;
  }

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

        const newlyUnlockedIds: string[] = [];
        updated.modules.forEach((m) => {
          const wasLocked = isModuleLocked(
            localPathway.modules.find((om) => om.id === m.id)!,
            localPathway.modules
          );
          const nowLocked = isModuleLocked(m, updated.modules);
          if (wasLocked && !nowLocked) newlyUnlockedIds.push(m.id);
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
          <p className="text-sm font-medium text-slate-700">
            No pathway yet
          </p>
          <p className="text-xs mt-1 text-slate-400">
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

  // ── Flatten: modules + their subtask cards interleaved ──
  type FlatItem =
    | { kind: "module"; mod: ModuleType; index: number }
    | { kind: "task"; task: Task; mod: ModuleType; subIndex: number }; // Added subIndex for animation delay orchestration

  const flatItems: FlatItem[] = [];
  localPathway.modules
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((mod, i) => {
      flatItems.push({ kind: "module", mod, index: i });
      if (expandedModules.has(mod.id)) {
        const sorted = [...mod.tasks].sort((a, b) => a.sort_order - b.sort_order);
        sorted.forEach((task, subIndex) => {
          flatItems.push({ kind: "task", task, mod, subIndex });
        });
      }
    });

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 max-w-3xl mx-auto w-full">
      {/* Inject custom CSS keyframes for smooth slide down & fade in orchestration */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideCardDown {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-down {
          animation: slideCardDown 280s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `.replace('280s', '280ms') /* Safe injection fallback */}} />

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-50 mb-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {localPathway.title}
        </h2>
        {localPathway.summary && (
          <p className="text-sm mt-1.5 leading-relaxed text-slate-600">
            {localPathway.summary}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] font-medium text-slate-400">
          <span>{localPathway.subject || "-"}</span>
          <span>{localPathway.goal_level}</span>
          <span>{localPathway.duration}</span>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-[11px] mb-2 font-medium">
            <span className="text-slate-500">Progress</span>
            <span style={{ color: "var(--color-accent)" }} className="font-semibold tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-progress)" }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, background: "var(--color-accent)" }}
            />
          </div>
          <p className="text-[11px] mt-2 tabular-nums font-medium text-slate-400">
            {done} / {total} tasks
          </p>
        </div>
      </div>

      {/* ── Flat list: modules + subtask cards ── */}
      <div className="space-y-3">
        {flatItems.map((item) => {
          if (item.kind === "module") {
            const { mod, index } = item;
            const locked = isModuleLocked(mod, localPathway.modules);
            const modDone = mod.tasks.filter((t) => t.completed).length;
            const modTotal = mod.tasks.length;
            const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0;
            const isExpanded = expandedModules.has(mod.id);
            const isAnimating = animatingModules.has(mod.id);

            return (
              <div
                key={mod.id}
                className={`w-full bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-50 transition-all duration-300 ${
                  isAnimating ? "module-fade-in" : ""
                }`}
                style={{ opacity: locked ? 0.4 : 1 }}
              >
                <button
                  onClick={() => toggleExpand(mod.id)}
                  className="w-full flex items-center gap-3 text-left focus:outline-none"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: locked ? "var(--bg-progress)" : "var(--color-accent-bg)",
                      color: locked ? "var(--text-tertiary)" : "var(--color-accent)",
                    }}
                  >
                    {locked ? <Lock className="w-2.5 h-2.5" /> : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-base font-semibold truncate tracking-tight text-slate-900"
                        style={locked ? { color: "var(--text-tertiary)" } : undefined}
                      >
                        {mod.title}
                      </h3>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 tracking-wider"
                        style={{
                          background: mod.is_core !== false ? "var(--color-accent-bg)" : "var(--bg-progress)",
                          color: mod.is_core !== false ? "var(--color-accent)" : "var(--text-tertiary)",
                        }}
                      >
                        {mod.is_core !== false ? "CORE" : "EXT"}
                      </span>
                    </div>

                    {!locked && modTotal > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 rounded-full max-w-[60px]" style={{ background: "var(--bg-progress)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${modPct}%`, background: "var(--color-accent)" }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums font-medium text-slate-500">
                          {modDone}/{modTotal}
                        </span>
                      </div>
                    )}

                    {locked && (
                      <p className="text-[11px] mt-1 text-slate-400">
                        Complete previous module to unlock
                      </p>
                    )}
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                  )}
                </button>
              </div>
            );
          }

          // ── Task & Subtask cards ──
          const { task, mod, subIndex } = item;
          const locked = isModuleLocked(mod, localPathway.modules);

          return (
            <div
              key={task.id}
              onClick={() => {
                if (!locked) toggleTask(task, mod);
              }}
              className={`
                rounded-xl p-4 select-none
                bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-100/50
                ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"}
                ${task.completed ? "opacity-50" : ""}
                w-[93%] ml-auto will-change-transform
                animate-slide-down transition-all duration-200
              `}
              style={{
                // Orchestrate staggered cascading delay for multiple subtasks (35ms interval)
                animationDelay: `${subIndex * 35}ms`,
                // Keep initially hidden until animation plays
                animationFillMode: "both", 
              }}
              role="button"
              tabIndex={locked ? -1 : 0}
              onKeyDown={(e) => {
                if (!locked && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  toggleTask(task, mod);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                    task.completed 
                      ? "bg-slate-900 border-slate-900 text-white" 
                      : "border-slate-300"
                  }`}
                >
                  {task.completed && (
                    <svg 
                      className="w-2.5 h-2.5 stroke-[3.5]" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`block tracking-tight text-sm font-medium text-slate-800 transition-all duration-200 ${
                      task.completed ? "line-through text-slate-400 font-normal" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.description && !locked && (
                    <span className="block text-xs mt-1 leading-relaxed text-slate-500">
                      {task.description}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}