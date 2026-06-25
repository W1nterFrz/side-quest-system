"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Pathway } from "@/types";
import { api } from "@/lib/api";
import PathwayView from "@/components/PathwayView";
import PathwayMap from "@/components/PathwayMap";
import { List, GitGraph } from "lucide-react";

export default function PathwayPage() {
  const params = useParams();
  const slug = params.name as string;
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    if (!slug) return;
    api.getPathway(slug).then(setPathway).catch(() => setPathway(null)).finally(() => setLoading(false));
  }, [slug]);

  const handlePathwayUpdate = (updated: Pathway) => {
    setPathway(updated);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ background: "var(--color-accent)", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Pathway not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="sticky top-14 z-40 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-page)" }}>
        <div className="max-w-3xl mx-auto px-5 h-10 flex items-center gap-1">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: view === "list" ? "var(--color-accent-bg)" : "transparent",
              color: view === "list" ? "var(--color-accent)" : "var(--text-tertiary)",
            }}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setView("map")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: view === "map" ? "var(--color-accent-bg)" : "transparent",
              color: view === "map" ? "var(--color-accent)" : "var(--text-tertiary)",
            }}
          >
            <GitGraph className="w-3.5 h-3.5" />
            Map
          </button>
        </div>
      </div>

      {view === "list" ? (
        <PathwayView pathway={pathway} onPathwayUpdate={handlePathwayUpdate} />
      ) : (
        <PathwayMap pathway={pathway} />
      )}
    </div>
  );
}
