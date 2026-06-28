"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
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

// 1. Expanded node size to allow titles to fully display without truncation
const NODE_W = 260; // Increased from 200 to 260
const NODE_H = 96;  // Increased from 72 to 96
const H_GAP = 64;
const V_GAP = 24;   // Adjusted vertically for larger cards
const PADDING = 60;

export default function PathwayMap({ pathway }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Track canvas translation coordinates
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const centeredRef = useRef(false);

  const { nodes, edges, canvasW, canvasH } = useMemo(() => {
    return layoutPathway(pathway);
  }, [pathway]);

  // Center on first active node via transform coordinates
  useEffect(() => {
    centeredRef.current = false;
    const container = containerRef.current;
    if (!container || nodes.length === 0) return;

    let attempts = 0;
    const maxAttempts = 20;
    
    const tryCenter = () => {
      attempts++;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      if ((cw > 0 && ch > 0) || attempts >= maxAttempts) {
        const target =
          nodes.find((n) => n.status === "active") ??
          nodes.find((n) => n.status === "completed") ??
          nodes[0];

        if (target) {
          const targetCenterX = target.x + NODE_W / 2;
          const targetCenterY = target.y + NODE_H / 2;
          
          setPan({
            x: cw / 2 - targetCenterX,
            y: ch / 2 - targetCenterY,
          });
        }
        centeredRef.current = true;
        return;
      }

      requestAnimationFrame(tryCenter);
    };

    requestAnimationFrame(tryCenter);
  }, [nodes]);

  // Drag-to-pan implementation via state translation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    e.preventDefault();
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      
      setPan({
        x: dragStart.current.panX + deltaX,
        y: dragStart.current.panY + deltaY,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden select-none relative w-full h-full bg-[#fafafa]"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        backgroundImage: `radial-gradient(circle, #e5e5e5 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Large transparent wrapper div responsible for actual panning */}
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: canvasW,
          height: canvasH,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px)`,
        }}
      >
        {/* ── Edges ── */}
        {edges.map((edge, i) => {
          const dx = edge.x2 - edge.x1;
          const dy = edge.y2 - edge.y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isUnlocked = edge.fromStatus !== "locked";

          return (
            <div
              key={`edge-${i}`}
              className="absolute origin-left pointer-events-none"
              style={{
                left: edge.x1,
                top: edge.y1,
                width: length,
                height: isUnlocked ? 2 : 1.5,
                transform: `rotate(${angle}deg)`,
                background: isUnlocked
                  ? "#e5e5e5"
                  : `repeating-linear-gradient(90deg, #e5e5e5 0, #e5e5e5 4px, transparent 4px, transparent 8px)`,
              }}
            />
          );
        })}

        {/* ── Nodes ── */}
        {nodes.map((node) => {
          const pct = node.total > 0 ? Math.round((node.done / node.total) * 100) : 0;
          const isCore = node.module.is_core;
          const isCompleted = node.status === "completed";
          const isActive = node.status === "active";
          const isLocked = node.status === "locked";

          // Styling setup based on requirements
          let bg = "#ffffff";
          let textColor = "#171717";
          let subColor = "#737373";
          let shadow = "0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)";
          let opacity = 1;

          // 2. Completed nodes now adopt the same style as locked nodes (semi-transparent gray tint)
          if (isLocked || isCompleted) {
            bg = "rgba(255, 255, 255, 0.6)";
            textColor = "#a3a3a3";
            subColor = "#a3a3a3";
            shadow = "none";
            opacity = 0.75;
          } else if (isActive) {
            // Highlighting style for active nodes
            shadow = "0 10px 25px rgba(59, 130, 246, 0.12), 0 2px 8px rgba(59, 130, 246, 0.05)";
            bg = "#ffffff";
          }

          return (
            <div
              key={node.id}
              className="absolute flex flex-col justify-between p-4 transition-all duration-300 ease-out border border-transparent"
              style={{
                left: node.x,
                top: node.y,
                width: NODE_W,
                height: NODE_H,
                background: bg,
                borderRadius: isCore ? 12 : 18,
                boxShadow: shadow,
                opacity: opacity,
                borderColor: isActive ? "rgba(59, 130, 246, 0.2)" : "transparent",
              }}
              title={node.module.title}
            >
              {/* Content Box */}
              <div className="flex-1 pr-6">
                {/* Title: Un-truncated block to fully display multiline titles */}
                <div
                  className="text-sm font-semibold leading-snug break-words line-clamp-2"
                  style={{ color: textColor }}
                >
                  {node.module.title}
                </div>

                {/* Subtitle */}
                <div
                  className="text-[11px] mt-1 font-medium"
                  style={{ color: subColor }}
                >
                  {isCore ? "Core" : "Extension"} &middot; {node.done}/{node.total}
                </div>
              </div>

              {/* Progress bar */}
              {node.total > 0 && !isLocked && !isCompleted && (
                <div
                  className="mt-2 h-1.5 rounded-full overflow-hidden w-full bg-[#f5f5f5]"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[#3b82f6]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {/* 3. Status icon relocated to the bottom-right corner */}
              <div className="absolute right-4 bottom-4 flex items-center justify-center">
                {isCompleted && <CheckCircle2 size={16} color="#22c55e" strokeWidth={2.5} />}
                {isLocked && <Lock size={13} color="#a3a3a3" />}
                {isActive && (
                  <div className="w-2 h-2 rounded-full animate-pulse bg-[#3b82f6]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Layout engine ──
function layoutPathway(pathway: Pathway) {
  const modules = pathway.modules;
  const moduleMap = new Map<string, Module>(modules.map((m) => [m.id, m]));

  function getStatus(mod: Module): "completed" | "active" | "locked" {
    const allDone = mod.tasks.length > 0 && mod.tasks.every((t) => t.completed);
    if (allDone) return "completed";

    if (mod.depends_on && mod.depends_on.length > 0) {
      const depsMet = mod.depends_on.every((depId) => {
        const depMod = moduleMap.get(depId);
        return depMod && depMod.tasks.length > 0 && depMod.tasks.every((t) => t.completed);
      });
      if (!depsMet) return "locked";
    } else {
      const prevModules = modules.filter((m) => m.sort_order < mod.sort_order);
      if (prevModules.length > 0) {
        const allPrevDone = prevModules.every(
          (m) => m.tasks.length > 0 && m.tasks.every((t) => t.completed)
        );
        if (!allPrevDone) return "locked";
      }
    }

    return "active";
  }

  const coreModules = modules.filter((m) => m.is_core !== false);
  const extModules = modules.filter((m) => m.is_core === false);

  const nodes: LayoutNode[] = [];
  const edges: {
    fromId: string;
    toId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    fromStatus: string;
  }[] = [];

  const colX = PADDING;
  coreModules.sort((a, b) => a.sort_order - b.sort_order);
  coreModules.forEach((mod, i) => {
    const status = getStatus(mod);
    const total = mod.tasks.length;
    const done = mod.tasks.filter((t) => t.completed).length;
    const cy = PADDING + i * (NODE_H + V_GAP);
    nodes.push({ id: mod.id, module: mod, x: colX, y: cy, total, done, status });

    if (i > 0) {
      const prevNode = nodes.find((n) => n.id === coreModules[i - 1].id);
      if (prevNode) {
        edges.push({
          fromId: prevNode.id,
          toId: mod.id,
          x1: prevNode.x + NODE_W / 2,
          y1: prevNode.y + NODE_H,
          x2: colX + NODE_W / 2,
          y2: cy,
          fromStatus: prevNode.status,
        });
      }
    }
  });

  const extX = colX + NODE_W + H_GAP;
  extModules.sort((a, b) => a.sort_order - b.sort_order);
  extModules.forEach((mod, i) => {
    const status = getStatus(mod);
    const total = mod.tasks.length;
    const done = mod.tasks.filter((t) => t.completed).length;
    const ey = PADDING + i * (NODE_H + V_GAP);
    nodes.push({ id: mod.id, module: mod, x: extX, y: ey, total, done, status });

    let parentId: string | null = null;
    if (mod.depends_on && mod.depends_on.length > 0) {
      parentId = mod.depends_on[0];
    } else {
      const closest = coreModules
        ? coreModules
            .filter((c) => c.sort_order < mod.sort_order)
            .sort((a, b) => b.sort_order - a.sort_order)[0]
        : null;
      if (closest) parentId = closest.id;
    }

    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (parentNode) {
        edges.push({
          fromId: parentId,
          toId: mod.id,
          x1: parentNode.x + NODE_W,
          y1: parentNode.y + NODE_H / 2,
          x2: extX,
          y2: ey + NODE_H / 2,
          fromStatus: parentNode.status,
        });
      }
    }
  });

  const coreBottom = coreModules.length > 0
    ? PADDING + (coreModules.length - 1) * (NODE_H + V_GAP) + NODE_H
    : 0;
  const extBottom = extModules.length > 0
    ? PADDING + (extModules.length - 1) * (NODE_H + V_GAP) + NODE_H
    : 0;
  const contentH = Math.max(coreBottom, extBottom) + PADDING;
  const contentW = extModules.length > 0
    ? extX + NODE_W + PADDING
    : colX + NODE_W + PADDING;

  const canvasW = contentW + 800;
  const canvasH = Math.max(contentH + 600, 400);

  return { nodes, edges, canvasW, canvasH };
}