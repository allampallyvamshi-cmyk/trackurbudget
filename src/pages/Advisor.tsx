import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import PageHead from "@/components/PageHead";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Lightbulb, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FinancialContext {
  monthlyExpenses: number;
  topCategories: { category: string; amount: number }[];
  budgetStatus: { category: string; spent: number; limit: number }[];
}

const quickPrompts = [
  "Where am I overspending?",
  "How can I save more?",
  "Give me a monthly budget plan",
  "Summarize my spending this month",
];

const HealthScoreRing = ({ score }: { score: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 70 ? "text-primary" : score > 50 ? "text-yellow-400" : "text-destructive";
  const strokeColor = score > 70 ? "hsl(160, 84%, 39%)" : score > 50 ? "hsl(45, 90%, 55%)" : "hsl(0, 84%, 60%)";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(222, 30%, 22%)" strokeWidth="10" />
          <circle cx="64" cy="64" r={radius} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display text-3xl font-bold", color)}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium">Financial Health</p>
      <p className="text-xs text-muted-foreground">{score > 70 ? "Excellent" : score > 50 ? "Good — room to improve" : "Needs attention"}</p>
    </div>
  );
};

const Advisor = () => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI Budget Advisor. I can see your spending data and help you make better financial decisions. Ask me anything about your budget, savings, or spending!" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<FinancialContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Fetch financial context
  useEffect(() => {
    const fetchContext = async () => {
      const now = new Date();
      const mStart = format(startOfMonth(now), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const [expRes, budgetRes] = await Promise.all([
        supabase.from("expenses").select("amount, category").gte("date", mStart).lte("date", mEnd),
        supabase.from("budgets").select("category, amount_limit").eq("month", format(now, "yyyy-MM")),
      ]);

      const expenses = expRes.data || [];
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

      const catMap: Record<string, number> = {};
      expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });

      const topCategories = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }));

      const budgetStatus = (budgetRes.data || []).map((b) => ({
        category: b.category,
        spent: catMap[b.category] || 0,
        limit: Number(b.amount_limit),
      }));

      setContext({ monthlyExpenses: totalExpenses, topCategories, budgetStatus });
      setContextLoading(false);
    };
    fetchContext();
  }, []);

  const healthScore = context
    ? Math.min(100, Math.max(0, Math.round(
        context.budgetStatus.length > 0
          ? 100 - (context.budgetStatus.filter((b) => b.spent > b.limit).length / context.budgetStatus.length) * 50
          : 50
      )))
    : 50;

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const chatHistory = [...messages.slice(1), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: chatHistory,
            financialContext: context,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "AI service error" }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const finalContent = assistantSoFar;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: finalContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const finalContent = assistantSoFar;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: finalContent } : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error("AI Advisor error:", e);
      toast({
        title: "AI Advisor Error",
        description: e.message || "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-6 animate-fade-in">
      <PageHead title="AI Advisor" description="Get personalized financial advice" />
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button key={prompt} onClick={() => handleSend(prompt)} disabled={isTyping} className="rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50">{prompt}</button>
          ))}
        </div>

        <div ref={scrollRef} className="glass-card flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                {msg.role === "assistant" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15"><Bot className="h-4 w-4 text-primary" /></div>}
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-foreground border border-primary/20")}>
                  {msg.content.split("\n").map((line, j) => <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>)}
                </div>
                {msg.role === "user" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15"><Bot className="h-4 w-4 text-primary" /></div>
                <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-primary/70">Analyzing your finances...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask about your budget, savings tips..." className="min-h-[44px] max-h-28 resize-none" rows={1} />
          <Button onClick={() => handleSend()} disabled={isTyping || !input.trim()} size="icon" className="shrink-0 h-11 w-11"><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="hidden w-80 shrink-0 flex-col gap-5 lg:flex">
        <div className="glass-card flex flex-col items-center p-6">
          {contextLoading ? <Skeleton className="h-36 w-36 rounded-full" /> : <HealthScoreRing score={healthScore} />}
        </div>

        <div className="glass-card flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-semibold">Your Context</h2>
          </div>
          {contextLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : context ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Monthly Expenses</p>
                <p className="font-display text-lg font-bold text-primary">${context.monthlyExpenses.toFixed(2)}</p>
              </div>
              {context.topCategories.map((c) => (
                <div key={c.category} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
                  <span className="text-sm font-medium">{c.category}</span>
                  <span className="font-display text-sm font-semibold">${c.amount.toFixed(2)}</span>
                </div>
              ))}
              {context.budgetStatus.filter((b) => b.spent > b.limit).map((b) => (
                <div key={b.category} className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive font-medium">⚠️ {b.category} over budget</p>
                  <p className="text-xs text-destructive/70">${b.spent.toFixed(2)} / ${b.limit.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Advisor;
