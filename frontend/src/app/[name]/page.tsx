"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Pathway } from "@/types";
import { api } from "@/lib/api";
import PathwayView from "@/components/PathwayView";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function QuestPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: slug } = use(params);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPathway(slug).then(setPathway).catch(() => setError("Quest not found")).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map((i) => <span key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    );
  }

  if (error || !pathway) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Sparkles className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--icon-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Quest not found</p>
          <Link href="/" className="text-xs mt-3 inline-block" style={{ color: "var(--color-accent)" }}>Back to quests</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="sticky top-14 z-40 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-page)" }}>
        <div className="max-w-3xl mx-auto px-5 h-10 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </div>
      <PathwayView pathway={pathway} />
    </div>
  );
}