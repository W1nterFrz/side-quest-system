"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuestSummary } from "@/types";
import { api } from "@/lib/api";
import { Plus, Sparkles, ChevronRight, BookOpen } from "lucide-react";

const DEMO_USER = "00000000-0000-0000-0000-000000000001";

export default function HomePage() {
  const router = useRouter();
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listPathways(DEMO_USER).then(setQuests).catch(() => setQuests([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-5xl mx-auto w-full px-5 pt-12 pb-24">
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>Your quests</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Turn any skill into a trackable path.</p>
        </div>

        <button onClick={() => router.push("/new")} className="card card-hover w-full flex items-center gap-4 py-5 mb-8 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-bg)" }}>
            <Plus className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>New quest</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Tell me what you want to learn, and I will build you a path.</p>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--icon-muted)" }} />
        </button>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="card rounded-xl h-24 animate-pulse" style={{ background: "var(--bg-card)" }} />)}
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--icon-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No quests yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Tap "New quest" above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quests.map((q) => {
              const pct = q.total_tasks > 0 ? Math.round((q.completed_tasks / q.total_tasks) * 100) : 0;
              return (
                <Link key={q.id} href={`/${q.slug}`} className="card card-hover flex items-center gap-4 py-4 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-bg)" }}>
                    <Sparkles className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{q.title}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}>{q.subject}</span>
                    </div>
                    {q.total_tasks > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 rounded-full max-w-[160px]" style={{ background: "var(--bg-progress)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{q.completed_tasks}/{q.total_tasks}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{q.goal_level}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{q.duration}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--icon-muted)" }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}