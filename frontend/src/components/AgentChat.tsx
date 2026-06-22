"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentPhase, ChatResponse, Pathway } from "@/types";
import { api } from "@/lib/api";
import { Send, Bot, Loader2 } from "lucide-react";

interface Props { onPathwayReady: (pathway: Pathway, convId: string) => void; conversationId: string | null; }
interface Message { role: "user" | "assistant" | "system"; content: string; agent?: string; }

const PHASE_LABELS: Record<AgentPhase, string> = { goal_clarifier: "Goal Clarifier", pathway_planner: "Pathway Planner", task_quantifier: "Task Quantifier" };
const PHASE_DESC: Record<AgentPhase, string> = { goal_clarifier: "Let me understand your learning goals.", pathway_planner: "Now I will build your personalized pathway.", task_quantifier: "Breaking each module into concrete steps..." };

export default function AgentChat({ onPathwayReady, conversationId: initialConvId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<AgentPhase>("goal_clarifier");
  const [convId, setConvId] = useState<string | null>(initialConvId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput(""); setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    try {
      const res = await api.chat({ conversation_id: convId, agent: phase, message: userMsg });
      setConvId(res.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, agent: res.agent }]);
      if (res.pathway) { onPathwayReady(res.pathway, res.conversation_id); setPhase("task_quantifier"); }
      if (phase === "goal_clarifier" && res.reply.includes("[PROFILE_COMPLETE]")) {
        setPhase("pathway_planner");
        setTimeout(async () => {
          const f = await api.chat({ conversation_id: res.conversation_id, agent: "pathway_planner", message: "Please generate a learning pathway based on my goals." });
          setMessages((prev) => [...prev, { role: "assistant", content: f.reply, agent: "pathway_planner" }]);
          if (f.pathway) onPathwayReady(f.pathway, f.conversation_id);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "system", content: String(err) }]);
    } finally { if (phase !== "goal_clarifier") setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-5">
      <div className="mb-5 p-3 rounded-xl border text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-card)" }}>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
          <span style={{ color: "var(--color-accent)" }} className="font-medium">{PHASE_LABELS[phase]}</span>
        </div>
        <div className="flex gap-1.5 mt-2.5">
          {["goal_clarifier","pathway_planner","task_quantifier"].map((p) => {
            const agents = ["goal_clarifier","pathway_planner","task_quantifier"];
            const idx = agents.indexOf(phase);
            const done = agents.indexOf(p) < idx;
            const active = p === phase;
            return <div key={p} className="h-1 rounded-full flex-1 transition-all" style={{ background: active || done ? "var(--color-accent)" : "var(--bg-progress)", opacity: done && !active ? 0.5 : 1 }} />;
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--icon-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Hello! What would you like to learn?</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>e.g. "I want to learn C++ for work"</p>
          </div>
        )}
        {messages.map((m,i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role !== "user" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-bg)" }}>
                <Bot className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed" style={m.role === "user" ? { background: "var(--color-accent)", color: "#fff", borderRadius: "16px 16px 4px 16px" } : m.role === "system" ? { background: "#2a1515", color: "#f87171" } : { background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: "16px 16px 16px 4px" }}>
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--bg-card)" }}>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>You</span>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-bg)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--color-accent)" }} />
            </div>
            <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: "var(--bg-card)" }}>
              <div className="flex gap-1">
                {[0,1,2].map((k) => <span key={k} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: `${k * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={phase === "goal_clarifier" ? "Describe what you want to learn..." : 'Ask a question or type "continue"...'} className="input-field flex-1" disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}