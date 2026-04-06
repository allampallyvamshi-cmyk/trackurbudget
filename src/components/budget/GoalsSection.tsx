import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
}

const GoalsSection = () => {
  const { toast } = useToast();
  const { fmt, symbol } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formSaved, setFormSaved] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setMounted(false);
    const { data, error } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load goals", variant: "destructive" });
    } else {
      setGoals((data || []).map((g: any) => ({
        id: g.id, name: g.name, target_amount: Number(g.target_amount),
        saved_amount: Number(g.saved_amount), deadline: g.deadline,
      })));
    }
    setLoading(false);
    setTimeout(() => setMounted(true), 50);
  }, [toast]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const openAdd = () => { setEditingGoal(null); setFormName(""); setFormTarget(""); setFormSaved(""); setFormDeadline(""); setModalOpen(true); };
  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g); setFormName(g.name); setFormTarget(String(g.target_amount));
    setFormSaved(String(g.saved_amount)); setFormDeadline(g.deadline || ""); setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTarget || parseFloat(formTarget) <= 0) return;
    setFormLoading(true);
    try {
      const payload = {
        name: formName.trim(),
        target_amount: parseFloat(formTarget),
        saved_amount: parseFloat(formSaved) || 0,
        deadline: formDeadline || null,
      };
      if (editingGoal) {
        const { error } = await supabase.from("savings_goals").update(payload).eq("id", editingGoal.id);
        if (error) throw error;
        toast({ title: "Goal updated" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("savings_goals").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
        toast({ title: "Goal created" });
      }
      setModalOpen(false);
      fetchGoals();
    } catch {
      toast({ title: "Failed to save goal", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("savings_goals").delete().eq("id", deleteTarget.id);
    if (error) toast({ title: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Goal deleted" }); setDeleteTarget(null); fetchGoals(); }
  };

  const getColor = (pct: number) => {
    if (pct >= 100) return "bg-emerald-500";
    if (pct >= 60) return "bg-primary";
    return "bg-yellow-500";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Savings Goals
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5" /> Add Goal
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold">No savings goals yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Set goals like "New Laptop" or "Vacation Fund" and track your progress.</p>
          <Button className="mt-6 gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Goal</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g, i) => {
            const pct = Math.min((g.saved_amount / g.target_amount) * 100, 100);
            const remaining = g.target_amount - g.saved_amount;
            return (
              <div key={g.id} className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">{g.name}</p>
                      {g.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(g.deadline), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(g)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full transition-all duration-700 ease-out", getColor(pct))} style={{ width: mounted ? `${pct}%` : "0%" }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{fmt(g.saved_amount)} <span className="text-muted-foreground/60">/ {fmt(g.target_amount)}</span></span>
                  <span className={cn("text-xs font-semibold", pct >= 100 ? "text-emerald-400" : "text-primary")}>
                    {pct >= 100 ? "🎉 Goal reached!" : fmt(remaining) + " to go"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingGoal ? "Edit Goal" : "Add Savings Goal"}</DialogTitle>
            <DialogDescription>Set a target amount and track your savings progress.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label>Goal Name</Label>
              <Input placeholder="e.g. New Laptop" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount ({symbol})</Label>
              <Input type="number" step="0.01" placeholder="60000" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount Saved ({symbol})</Label>
              <Input type="number" step="0.01" placeholder="0" value={formSaved} onChange={(e) => setFormSaved(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline (optional)</Label>
              <Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={formLoading}>{formLoading ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete "{deleteTarget?.name}" goal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsSection;
