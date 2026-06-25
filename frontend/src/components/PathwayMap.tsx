"use client";

import { useMemo } from "react";
import type { Pathway, Module } from "@/types";
import { CheckCircle2, Lock } from "lucide-react";

interface Props {
  pathway: Pathway;
}

interface LayoutNode {
  id: string;
  module: Module;
  x: number;
  y: number;
  total: number;
  done: number;
  status: "completed" | "active" | "locked";
}

const NODE_W = 180;
const NODE_H = 56;
const H_GAP = 80;
const V_GAP = 24;

export default function PathwayMap({ pathway }: Props) {
  const { nodes, edges, svgW, svgH } = useMemo(() => {
    return layoutPathway(pathway);
  }, [pathway]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 flex items-start justify-center min-h-full">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="shrink-0"
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const isUnlocked = edge.fromStatus !== "locked";
            return (
              <g key={`edge-${i}`}>
                {/* Arrow line */}
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={isUnlocked ? "var(--border-card)" : "var(--text-tertiary)"}
                  strokeWidth={isUnlocked ? 2 : 1.5}
                  strokeDasharray={isUnlocked ? undefined : "6 4"}
                  opacity={isUnlocked ? 0.8 : 0.4}
                />
                {/* Arrowhead */}
                <polygon
                  points={edge.arrowPoints}
                  fill={isUnlocked ? "var(--border-card)" : "var(--text-tertiary)"}
                  opacity={isUnlocked ? 0.8 : 0.4}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pct = node.total > 0 ? Math.round((node.done / node.total) * 100) : 0;
            const isCore = node.module.is_core;
            const isCompleted = node.status === "completed";
            const isActive = node.status === "active";
            const isLocked = node.status === "locked";

            let borderColor = "var(--border-card)";
            let bgColor = "var(--bg-card)";
            let textColor = "var(--text-primary)";

            if (isCompleted) {
              borderColor = "#22c55e";
              bgColor = "var(--bg-card)";
            } else if (isActive) {
              borderColor = "var(--color-accent)";
              bgColor = "var(--color-accent-bg)";
            } else if (isLocked) {
              borderColor = "var(--text-tertiary)";
              textColor = "var(--text-tertiary)";
            }

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {/* Node rect */}
                <rect
                  x={0}
                  y={0}
                  width={NODE_W}
                  height={NODE_H}
                  rx={isCore ? 6 : 10}
                  ry={isCore ? 6 : 10}
                  fill={bgColor}
                  stroke={borderColor}
                  strokeWidth={isCompleted ? 2.5 : isCore ? 2 : 1.5}
                  strokeDasharray={isLocked ? "4 3" : undefined}
                />

                {/* Status indicator - left bar */}
                {isActive && !isCompleted && (
                  <rect x={0} y={4} width={3} height={NODE_H - 8} rx={1.5} fill="var(--color-accent)" />
                )}

                {/* Title */}
                <text
                  x={14}
                  y={20}
                  textAnchor="start"
                  fontSize={12}
                  fontWeight={600}
                  fill={textColor}
                  fontFamily="system-ui, sans-serif"
                >
                  {node.module.title.length > 16
                    ? node.module.title.slice(0, 15) + "…"
                    : node.module.title}
                </text>

                {/* Subtitle */}
                <text
                  x={14}
                  y={37}
                  textAnchor="start"
                  fontSize={10}
                  fill={isLocked ? "var(--text-tertiary)" : "var(--text-secondary)"}
                  fontFamily="system-ui, sans-serif"
                >
                  {isCore ? "Core" : "Extension"} · {node.done}/{node.total} tasks
                </text>

                {/* Progress bar */}
                {node.total > 0 && !isLocked && (
                  <g>
                    <rect
                      x={14}
                      y={44}
                      width={NODE_W - 48}
                      height={3}
                      rx={1.5}
                      fill="var(--bg-progress)"
                    />
                    <rect
                      x={14}
                      y={44}
                      width={(NODE_W - 48) * (pct / 100)}
                      height={3}
                      rx={1.5}
                      fill={isCompleted ? "#22c55e" : "var(--color-accent)"}
                    />
                  </g>
                )}

                {/* Status icon */}
                {isCompleted && (
                  <g transform={`translate(${NODE_W - 28}, 14)`}>
                    <CheckCircle2 size={14} color="#22c55e" strokeWidth={2.5} />
                  </g>
                )}
                {isLocked && (
                  <g transform={`translate(${NODE_W - 28}, 14)`}>
                    <Lock size={12} style={{ color: "var(--text-tertiary)" }} />
                  </g>
                )}

                {/* isActive dot */}
                {isActive && !isCompleted && (
                  <circle cx={NODE_W - 21} cy={21} r={4} fill="var(--color-accent)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function layoutPathway(pathway: Pathway) {
  const modules = pathway.modules;
  const moduleMap = new Map<string, Module>(modules.map((m) => [m.id, m]));

  // Determine module status
  function getStatus(mod: Module): "completed" | "active" | "locked" {
    const allDone = mod.tasks.length > 0 && mod.tasks.every((t) => t.completed);
    if (allDone) return "completed";

    // Check if all dependencies are completed
    if (mod.depends_on && mod.depends_on.length > 0) {
      const depsMet = mod.depends_on.every((depId) => {
        const depMod = moduleMap.get(depId);
        return depMod && depMod.tasks.length > 0 && depMod.tasks.every((t) => t.completed);
      });
      if (!depsMet) return "locked";
    } else {
      // First module or no deps - check if earlier same-type modules done
      // A module is locked if any preceding module (by sort_order) is not completed
      const prevModules = modules.filter((m) => m.sort_order < mod.sort_order);
      if (prevModules.length > 0) {
        const allPrevDone = prevModules.every((m) =>
          m.tasks.length > 0 && m.tasks.every((t) => t.completed)
        );
        if (!allPrevDone) return "locked";
      }
    }

    return "active";
  }

  // Build topology: separate core and extension modules
  const coreModules = modules.filter((m) => m.is_core !== false);
  const extModules = modules.filter((m) => m.is_core === false);

  // Layout core modules in a vertical chain
  const nodes: LayoutNode[] = [];
  const edges: {
    fromId: string;
    toId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    arrowPoints: string;
    fromStatus: string;
  }[] = [];

  const centerX = Math.max(NODE_W + H_GAP * coreModules.length, 400);
  const startX = Math.max((centerX * 2 - NODE_W) / 2, 100);
  // Use a single-column layout for the initial version
  const colX = startX;

  // Place core modules vertically
  coreModules.sort((a, b) => a.sort_order - b.sort_order);
  coreModules.forEach((mod, i) => {
    const status = getStatus(mod);
    const total = mod.tasks.length;
    const done = mod.tasks.filter((t) => t.completed).length;
    nodes.push({
      id: mod.id,
      module: mod,
      x: colX,
      y: 20 + i * (NODE_H + V_GAP),
      total,
      done,
      status,
    });

    // Draw edge from previous module
    if (i > 0) {
      const prevNode = nodes.find((n) => n.id === coreModules[i - 1].id);
      if (prevNode) {
        const fromX = prevNode.x + NODE_W / 2;
        const fromY = prevNode.y + NODE_H;
        const toX = colX + NODE_W / 2;
        const toY = 20 + i * (NODE_H + V_GAP);
        edges.push({
          fromId: prevNode.id,
          toId: mod.id,
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: toY,
          arrowPoints: `${toX - 5},${toY - 8} ${toX},${toY - 2} ${toX + 5},${toY - 8}`,
          fromStatus: prevNode.status,
        });
      }
    }
  });

  // Place extension modules to the right
  const extStartY = 20;
  extModules.sort((a, b) => a.sort_order - b.sort_order);
  extModules.forEach((mod, i) => {
    const status = getStatus(mod);
    const total = mod.tasks.length;
    const done = mod.tasks.filter((t) => t.completed).length;
    const extX = colX + NODE_W + H_GAP;
    const extY = extStartY + i * (NODE_H + V_GAP);

    nodes.push({
      id: mod.id,
      module: mod,
      x: extX,
      y: extY,
      total,
      done,
      status,
    });

    // Draw edge from the dependency or closest core module
    let parentId: string | null = null;
    if (mod.depends_on && mod.depends_on.length > 0) {
      parentId = mod.depends_on[0];
    } else {
      // Fallback: connect to closest core module by sort_order
      const closest = coreModules
        .filter((c) => c.sort_order < mod.sort_order)
        .sort((a, b) => b.sort_order - a.sort_order)[0];
      if (closest) parentId = closest.id;
    }

    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (parentNode) {
        const fromX = parentNode.x + NODE_W;
        const fromY = parentNode.y + NODE_H / 2;
        const toX = extX;
        const toY = extY + NODE_H / 2;
        // Draw an L-shaped path via an intermediate point
        const midX = fromX + H_GAP / 2;

        edges.push({
          fromId: parentId,
          toId: mod.id,
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: toY,
          arrowPoints: `${toX - 5},${toY - 5} ${toX},${toY} ${toX - 5},${toY + 5}`,
          fromStatus: parentNode.status,
        });
      }
    }
  });

  const svgH = Math.max(
    coreModules.length * (NODE_H + V_GAP) + 40,
    extModules.length * (NODE_H + V_GAP) + 40,
    300
  );
  const svgW = colX + NODE_W + (extModules.length > 0 ? H_GAP + NODE_W : 0) + 40;

  return { nodes, edges, svgW, svgH };
}