import { useState, useEffect, useCallback } from "react";
import { differenceInMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalRow {
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
}

interface SavingsSectionProps {
  totalSpent: number;
  loading: boolean;
  mounted: boolean;
}

const SavingsSection = ({ totalSpent, loading, mounted }: SavingsSectionProps) => {
  const { fmt } = useCurrency();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    const { data } = await supabase.from("savings_goals").select("target_amount, saved_amount, deadline");
    setGoals((data || []).map((g: any) => ({
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
      deadline: g.deadline,
    })));
    setGoalsLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Calculate required monthly savings from goals with deadlines
  const now = new Date();
  let monthlyTarget = 0;
  const breakdowns: { remaining: number; months: number }[] = [];

  goals.forEach((g) => {
    if (!g.deadline) return;
    const deadlineDate = new Date(g.deadline);
    const monthsLeft = Math.max(differenceInMonths(deadlineDate, now), 1);
    const remaining = Math.max(g.target_amount - g.saved_amount, 0);
    if (remaining > 0) {
      const perMonth = remaining / monthsLeft;
      monthlyTarget += perMonth;
      breakdowns.push({ remaining, months: monthsLeft });
    }
  });

  const goalsWithDeadline = goals.filter((g) => g.deadline && g.target_amount - g.saved_amount > 0);
  const isLoading = loading || goalsLoading;
  const pct = monthlyTarget > 0 ? Math.min(Math.max(((monthlyTarget - totalSpent) / monthlyTarget) * 100, 0), 100) : 0;

  const getColor = (p: number) => {
    if (p >= 80) return "bg-emerald-500";
    if (p >= 50) return "bg-primary";
    return "bg-yellow-500";
  };

  return (
    <div className="space-y-3">
      <h2 className="font-display text-base font-semibold flex items-center gap-2">
        <PiggyBank className="h-4 w-4 text-emerald-400" /> Monthly Savings Target
      </h2>

      {isLoading ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : goalsWithDeadline.length === 0 ? (
        <div className="glass-card flex items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">Add savings goals with deadlines to auto-calculate your monthly savings target.</p>
        </div>
      ) : (
        <div className="glass-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Required Monthly Savings</p>
              <p className="font-display text-lg font-bold">{fmt(monthlyTarget)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent This Month</p>
              <p className="font-display text-lg font-bold">{fmt(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">On Track</p>
              <p className={cn("font-display text-lg font-bold", totalSpent > monthlyTarget ? "text-destructive" : "text-emerald-400")}>
                {totalSpent <= monthlyTarget ? "✓ Yes" : "✗ Overspending"}
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Based on {goalsWithDeadline.length} goal{goalsWithDeadline.length > 1 ? "s" : ""} with deadlines</span>
              <span>Keep spending under {fmt(monthlyTarget)}/mo</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div className={cn("h-full rounded-full transition-all duration-700 ease-out", getColor(pct))} style={{ width: mounted ? `${pct}%` : "0%" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsSection;
