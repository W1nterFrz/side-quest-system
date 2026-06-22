"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Pathway } from "@/types";
import AgentChat from "@/components/AgentChat";
import { ArrowLeft } from "lucide-react";

export default function NewQuestPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handlePathwayReady = (pathway: Pathway, convId: string) => {
    router.push(`/${pathway.slug}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="sticky top-14 z-40 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-page)" }}>
        <div className="max-w-3xl mx-auto px-5 h-10 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </div>
      <AgentChat onPathwayReady={handlePathwayReady} conversationId={conversationId} />
    </div>
  );
}