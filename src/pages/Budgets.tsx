import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import PageHead from "@/components/PageHead";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, AlertTriangle, Wallet, TrendingDown, PiggyBank,
  UtensilsCrossed, Car, Home, Film, Heart, ShoppingBag, Package, CalendarDays, LayoutGrid,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { z } from "zod";
import SavingsSection from "@/components/budget/SavingsSection";
import GoalsSection from "@/components/budget/GoalsSection";

interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  Food: { icon: UtensilsCrossed, color: "text-blue-400" },
  Transport: { icon: Car, color: "text-yellow-400" },
  Housing: { icon: Home, color: "text-emerald-400" },
  Entertainment: { icon: Film, color: "text-purple-400" },
  Health: { icon: Heart, color: "text-rose-400" },
  Shopping: { icon: ShoppingBag, color: "text-pink-400" },
  Other: { icon: Package, color: "text-muted-foreground" },
};

const categoryOptions = Object.keys(categoryConfig);
const MONTHLY_CATEGORY = "__monthly__";


type BudgetType = "monthly" | "category";

const budgetSchema = z.object({
  budgetType: z.enum(["monthly", "category"]),
  category: z.string().optional(),
  limit: z.coerce.number().positive("Must be positive").max(999999),
}).refine((data) => data.budgetType === "monthly" || (data.category && data.category.length > 0), {
  message: "Select a category",
  path: ["category"],
});

const SummaryCard = ({ label, value, icon: Icon, negative }: { label: string; value: string; icon: React.ElementType; negative?: boolean }) => (
  <div className="glass-card flex items-center gap-4 p-5">
    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", negative ? "bg-destructive/10" : "bg-primary/10")}>
      <Icon className={cn("h-6 w-6", negative ? "text-destructive" : "text-primary")} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-display text-lg font-bold", negative && "text-destructive")}>{value}</p>
    </div>
  </div>
);

const Budgets = () => {
  const { toast } = useToast();
  const { fmt, symbol } = useCurrency();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formCategory, setFormCategory] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formBudgetType, setFormBudgetType] = useState<BudgetType>("category");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  const monthStr = format(currentMonth, "yyyy-MM");

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setMounted(false);

    // Fetch budgets for the month
    const { data: budgetData, error } = await supabase
      .from("budgets").select("*").eq("month", monthStr);

    if (error) {
      toast({ title: "Failed to load budgets", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch expenses for this month to compute spent
    const mStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data: expData } = await supabase
      .from("expenses").select("amount, category").gte("date", mStart).lte("date", mEnd);

    const catSpent: Record<string, number> = {};
    let allSpent = 0;
    (expData || []).forEach((e) => {
      const amt = Number(e.amount);
      catSpent[e.category] = (catSpent[e.category] || 0) + amt;
      allSpent += amt;
    });

    setTotalSpent(allSpent);
    setBudgets((budgetData || []).map((b) => ({
      id: b.id,
      category: b.category,
      limit: Number(b.amount_limit),
      spent: b.category === MONTHLY_CATEGORY ? allSpent : (catSpent[b.category] || 0),
      month: b.month,
    })));

    setLoading(false);
    setTimeout(() => setMounted(true), 50);
  }, [monthStr, currentMonth, toast]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const monthlyBudget = budgets.find((b) => b.category === MONTHLY_CATEGORY);
  const categoryBudgets = budgets.filter((b) => b.category !== MONTHLY_CATEGORY);
  const totalCategoryBudget = categoryBudgets.reduce((s, b) => s + b.limit, 0);
  const totalCategorySpent = categoryBudgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetItems = categoryBudgets.filter((b) => b.spent > b.limit);

  const openAdd = () => { setEditingBudget(null); setFormCategory(""); setFormLimit(""); setFormBudgetType("category"); setFormErrors({}); setModalOpen(true); };
  const openEdit = (b: Budget) => { setEditingBudget(b); setFormBudgetType(b.category === MONTHLY_CATEGORY ? "monthly" : "category"); setFormCategory(b.category); setFormLimit(String(b.limit)); setFormErrors({}); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const category = formBudgetType === "monthly" ? MONTHLY_CATEGORY : formCategory;
    const result = budgetSchema.safeParse({ budgetType: formBudgetType, category, limit: formLimit });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0] as string] = err.message; });
      setFormErrors(errs);
      return;
    }

    setFormLoading(true);
    try {
      if (editingBudget) {
        const { error } = await supabase.from("budgets").update({ amount_limit: result.data.limit }).eq("id", editingBudget.id);
        if (error) throw error;
        toast({ title: "Budget updated" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("budgets").insert({
          user_id: user!.id,
          category,
          amount_limit: result.data.limit,
          month: monthStr,
        });
        if (error) throw error;
        toast({ title: "Budget created" });
      }
      setModalOpen(false);
      fetchBudgets();
    } catch {
      toast({ title: "Failed to save budget", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("budgets").delete().eq("id", deleteTarget.id);
    if (error) toast({ title: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Budget deleted" }); setDeleteTarget(null); fetchBudgets(); }
  };

  const getProgressColor = (pct: number) => {
    if (pct > 90) return "bg-destructive";
    if (pct > 70) return "bg-yellow-500";
    return "bg-primary";
  };

  const getProgressTextColor = (pct: number) => {
    if (pct > 90) return "text-destructive";
    if (pct > 70) return "text-yellow-400";
    return "text-primary";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHead title="Budget" description="Set and track your spending budgets" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[140px] text-center font-display text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Budget</Button>
      </div>

      {overBudgetItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 animate-fade-in">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Budget exceeded!</p>
            <p className="text-sm text-destructive/80">{overBudgetItems.map((b) => b.category).join(", ")} {overBudgetItems.length === 1 ? "has" : "have"} exceeded the spending limit.</p>
          </div>
        </div>
      )}

      {/* Monthly Budget Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Monthly Budget
          </h2>
          {!monthlyBudget && !loading && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setEditingBudget(null); setFormBudgetType("monthly"); setFormCategory(""); setFormLimit(""); setFormErrors({}); setModalOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Set Monthly Limit
            </Button>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-36 w-full rounded-xl" />
        ) : monthlyBudget ? (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-4 sm:grid-cols-3 flex-1">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Limit</p>
                  <p className="font-display text-lg font-bold">{fmt(monthlyBudget.limit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="font-display text-lg font-bold">{fmt(monthlyBudget.spent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={cn("font-display text-lg font-bold", (monthlyBudget.limit - monthlyBudget.spent) < 0 && "text-destructive")}>{fmt(monthlyBudget.limit - monthlyBudget.spent)}</p>
                </div>
              </div>
              <div className="flex gap-1 ml-3">
                <button onClick={() => openEdit(monthlyBudget)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleteTarget(monthlyBudget)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{Math.min((monthlyBudget.spent / monthlyBudget.limit) * 100, 100).toFixed(0)}% of monthly budget used</span>
                <span>{fmt(monthlyBudget.spent)} / {fmt(monthlyBudget.limit)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full transition-all duration-700 ease-out", getProgressColor((monthlyBudget.spent / monthlyBudget.limit) * 100))} style={{ width: mounted ? `${Math.min((monthlyBudget.spent / monthlyBudget.limit) * 100, 100)}%` : "0%" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card flex items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No monthly budget limit set. Click "Set Monthly Limit" to add one.</p>
          </div>
        )}
      </div>

      {/* Category Budgets Section */}
      <div className="space-y-3">
        <h2 className="font-display text-base font-semibold flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-primary" /> Category Budgets
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
        ) : categoryBudgets.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><LayoutGrid className="h-8 w-8 text-primary" /></div>
            <h3 className="font-display text-xl font-semibold">No category budgets set</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">Set category budgets to track your spending per category.</p>
            <Button className="mt-6 gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Category Budget</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryBudgets.map((b, i) => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              const pctRaw = (b.spent / b.limit) * 100;
              const remaining = b.limit - b.spent;
              const config = categoryConfig[b.category] || categoryConfig.Other;
              const Icon = config.icon;
              return (
                <div key={b.id} className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-secondary", config.color)}><Icon className="h-5 w-5" /></div>
                      <div>
                        <p className="font-display font-semibold">{b.category}</p>
                        <p className={cn("text-xs font-medium", getProgressTextColor(pctRaw))}>{pctRaw.toFixed(0)}% used</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(b)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(b)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full transition-all duration-700 ease-out", getProgressColor(pctRaw))} style={{ width: mounted ? `${pct}%` : "0%" }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fmt(b.spent)} <span className="text-muted-foreground/60">/ {fmt(b.limit)}</span></span>
                    <span className={cn("text-xs font-semibold", remaining < 0 ? "text-destructive" : "text-primary")}>
                      {remaining >= 0 ? fmt(remaining) + " left" : fmt(Math.abs(remaining)) + " over"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Savings Target Section */}
      <SavingsSection
        totalSpent={totalSpent}
        loading={loading}
        mounted={mounted}
      />

      {/* Savings Goals Section */}
      <GoalsSection />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingBudget ? "Edit Budget" : "Add Budget"}</DialogTitle>
            <DialogDescription>{editingBudget ? `Update the limit for ${editingBudget.category === MONTHLY_CATEGORY ? "monthly budget" : editingBudget.category}.` : "Choose budget type and set a spending limit."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {!editingBudget && (
              <div className="space-y-2">
                <Label>Budget Type</Label>
                <RadioGroup value={formBudgetType} onValueChange={(v) => setFormBudgetType(v as BudgetType)} className="grid grid-cols-2 gap-3">
                  <Label htmlFor="type-monthly" className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors", formBudgetType === "monthly" ? "border-primary bg-primary/10" : "border-border")}>
                    <RadioGroupItem value="monthly" id="type-monthly" />
                    <div>
                      <p className="text-sm font-medium">Monthly Limit</p>
                      <p className="text-xs text-muted-foreground">Overall spending cap</p>
                    </div>
                  </Label>
                  <Label htmlFor="type-category" className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors", formBudgetType === "category" ? "border-primary bg-primary/10" : "border-border")}>
                    <RadioGroupItem value="category" id="type-category" />
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-xs text-muted-foreground">Per-category limit</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>
            )}
            {formBudgetType === "category" && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory} disabled={!!editingBudget}>
                  <SelectTrigger className={formErrors.category ? "border-destructive" : ""}><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => {
                      const cfg = categoryConfig[c];
                      const CIcon = cfg.icon;
                      return <SelectItem key={c} value={c}><span className="flex items-center gap-2"><CIcon className={cn("h-4 w-4", cfg.color)} />{c}</span></SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                {formErrors.category && <p className="text-xs text-destructive">{formErrors.category}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{formBudgetType === "monthly" ? "Monthly Limit" : "Category Limit"} ({symbol})</Label>
              <Input type="number" step="0.01" placeholder="500.00" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} className={formErrors.limit ? "border-destructive" : ""} />
              {formErrors.limit && <p className="text-xs text-destructive">{formErrors.limit}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={formLoading}>{formLoading ? "Saving..." : editingBudget ? "Update Budget" : "Create Budget"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete {deleteTarget?.category === MONTHLY_CATEGORY ? "monthly" : deleteTarget?.category} budget?</AlertDialogTitle>
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

export default Budgets;
