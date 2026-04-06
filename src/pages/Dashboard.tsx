import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, differenceInMonths } from "date-fns";
import PageHead from "@/components/PageHead";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Lightbulb,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

// ── Types ──────────────────────────────────────────────
interface ChartPoint {
  month: string;
  amount: number;
}

interface BreakdownItem {
  category: string;
  amount: number;
  color: string;
  percent: number;
}

interface BudgetItem {
  category: string;
  spent: number;
  limit: number;
}

// ── Helpers ────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  Food: "hsl(200, 80%, 50%)",
  Housing: "hsl(160, 84%, 39%)",
  Transport: "hsl(45, 90%, 55%)",
  Entertainment: "hsl(280, 60%, 55%)",
  Shopping: "hsl(340, 75%, 55%)",
  Health: "hsl(0, 70%, 55%)",
  Other: "hsl(215, 20%, 50%)",
};

const categoryBadgeColors: Record<string, string> = {
  Food: "bg-blue-500/20 text-blue-400",
  Income: "bg-primary/20 text-primary",
  Entertainment: "bg-purple-500/20 text-purple-400",
  Transport: "bg-yellow-500/20 text-yellow-400",
  Shopping: "bg-pink-500/20 text-pink-400",
  Housing: "bg-primary/20 text-primary",
  Other: "bg-muted text-muted-foreground",
};

const getCategoryStyle = (cat: string) => categoryBadgeColors[cat] || categoryBadgeColors.Other;

// ── Sub-components ─────────────────────────────────────
const StatCard = ({
  label, value, subtitle, icon: Icon, loading, color = "text-primary",
}: {
  label: string; value: string; subtitle?: string; icon: React.ElementType; loading: boolean; color?: string;
}) => (
  <div className="glass-card p-5">
    {loading ? (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    ) : (
      <>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <p className="font-display text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </>
    )}
  </div>
);

// ── Dashboard ──────────────────────────────────────────
const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [lastMonthExpenses, setLastMonthExpenses] = useState(0);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const { toast } = useToast();
  const { fmt, symbol } = useCurrency();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const currentMonth = format(now, "yyyy-MM");
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const [currentRes, lastRes, recentRes, budgetRes, incomeRes, goalsRes] = await Promise.all([
          supabase.from("expenses").select("amount, category").gte("date", format(thisMonthStart, "yyyy-MM-dd")).lte("date", format(thisMonthEnd, "yyyy-MM-dd")),
          supabase.from("expenses").select("amount").gte("date", format(lastMonthStart, "yyyy-MM-dd")).lte("date", format(lastMonthEnd, "yyyy-MM-dd")),
          supabase.from("expenses").select("*").order("date", { ascending: false }).limit(5),
          supabase.from("budgets").select("*").eq("month", currentMonth),
          supabase.from("income").select("*").eq("month", currentMonth),
          supabase.from("savings_goals").select("*"),
        ]);

        // Income
        const incomeTotal = (incomeRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
        setMonthlyIncome(incomeTotal);

        // Current month totals
        const currentExpenses = currentRes.data || [];
        const total = currentExpenses.reduce((s, e) => s + Number(e.amount), 0);
        setTotalExpenses(total);

        // Last month totals
        const lastTotal = (lastRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
        setLastMonthExpenses(lastTotal);

        // Category breakdown with percentages
        const catMap: Record<string, number> = {};
        currentExpenses.forEach((e) => {
          catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
        });
        setBreakdown(
          Object.entries(catMap)
            .map(([category, amount]) => ({
              category,
              amount,
              color: categoryColors[category] || categoryColors.Other,
              percent: total > 0 ? (amount / total) * 100 : 0,
            }))
            .sort((a, b) => b.amount - a.amount)
        );

        // Recent expenses
        setRecentExpenses(recentRes.data || []);

        // Savings goals
        setSavingsGoals(goalsRes.data || []);

        // Budget progress
        const budgetData = (budgetRes.data || []).map((b) => ({
          category: b.category,
          limit: Number(b.amount_limit),
          spent: catMap[b.category] || 0,
        }));
        setBudgets(budgetData);

        // Budget exceeded notifications
        budgetData.forEach((b) => {
          if (b.spent > b.limit && b.category !== "__monthly__") {
            toast({
              title: `⚠️ Budget Exceeded: ${b.category}`,
              description: `You've spent ${fmt(b.spent)} of your ${fmt(b.limit)} ${b.category} budget.`,
              variant: "destructive",
            });
          }
        });

        const monthlyBudget = budgetData.find((b) => b.category === "__monthly__");
        if (monthlyBudget && total > monthlyBudget.limit) {
          toast({
            title: "⚠️ Monthly Budget Exceeded",
            description: `Total spending ${fmt(total)} exceeds your monthly limit of ${fmt(monthlyBudget.limit)}.`,
            variant: "destructive",
          });
        }

        // Chart — last 6 months
        const chartData: ChartPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const m = subMonths(now, i);
          const mStart = format(startOfMonth(m), "yyyy-MM-dd");
          const mEnd = format(endOfMonth(m), "yyyy-MM-dd");
          const { data } = await supabase.from("expenses").select("amount").gte("date", mStart).lte("date", mEnd);
          const sum = (data || []).reduce((s, e) => s + Number(e.amount), 0);
          chartData.push({ month: format(m, "MMM"), amount: sum });
        }
        setChart(chartData);
      } catch {
        toast({ title: "Error loading dashboard", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [toast]);

  const remaining = monthlyIncome - totalExpenses;
  const savingsRate = monthlyIncome > 0 ? (remaining / monthlyIncome) * 100 : 0;
  const highestCategory = breakdown.length > 0 ? breakdown[0] : null;

  // Calculate required monthly savings from goals
  const now = new Date();
  const requiredMonthlySavings = savingsGoals.reduce((sum: number, g: any) => {
    if (!g.deadline) return sum;
    const remaining = Number(g.target_amount) - Number(g.saved_amount);
    if (remaining <= 0) return sum;
    const monthsLeft = Math.max(differenceInMonths(new Date(g.deadline), now), 1);
    return sum + remaining / monthsLeft;
  }, 0);

  const expenseChange = lastMonthExpenses > 0
    ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0;

  // Bar chart data for category spending percentages
  const barData = breakdown.map((b) => ({
    category: b.category,
    percent: Math.round(b.percent),
    fill: b.color,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHead title="Dashboard" description="Overview of your finances" />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly Income" value={fmt(monthlyIncome)} subtitle={monthlyIncome === 0 ? "Add income →" : undefined} icon={Briefcase} loading={loading} color="text-primary" />
        <StatCard label="Monthly Expenses" value={fmt(totalExpenses)} subtitle={`${expenseChange >= 0 ? "+" : ""}${expenseChange.toFixed(1)}% from last month`} icon={TrendingDown} loading={loading} color="text-destructive" />
        <StatCard label="Remaining Balance" value={fmt(Math.max(remaining, 0))} subtitle={remaining < 0 ? "⚠️ Overspending!" : undefined} icon={Wallet} loading={loading} color={remaining >= 0 ? "text-primary" : "text-destructive"} />
        <StatCard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} subtitle={savingsRate < 20 ? "Try to save at least 20%" : "Great savings rate!"} icon={PiggyBank} loading={loading} color="text-primary" />
      </div>

      {/* Insights */}
      {!loading && monthlyIncome > 0 && (
        <div className="glass-card p-5">
          <h2 className="mb-3 font-display text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Spending Insights
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highestCategory && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="text-muted-foreground">Highest Spending</p>
                <p className="mt-1 font-medium">
                  Most money is spent on <span className="text-primary">{highestCategory.category}</span> ({highestCategory.percent.toFixed(1)}%)
                </p>
              </div>
            )}
            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <p className="text-muted-foreground">Savings Rate</p>
              <p className="mt-1 font-medium">
                Your savings rate is <span className={savingsRate >= 20 ? "text-primary" : "text-destructive"}>{savingsRate.toFixed(1)}%</span>
                {savingsRate < 20 && " — try to aim for 20%+"}
              </p>
            </div>
            {requiredMonthlySavings > 0 && (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                <p className="text-muted-foreground">Goals Check</p>
                <p className="mt-1 font-medium">
                  {remaining >= requiredMonthlySavings ? (
                    <span className="text-primary">✓ On track to meet your savings goals</span>
                  ) : (
                    <span className="text-destructive">
                      Need to save {fmt(requiredMonthlySavings)}/mo — reduce spending by {fmt(requiredMonthlySavings - Math.max(remaining, 0))}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass-card p-6 lg:col-span-3">
          <h2 className="mb-1 font-display text-base font-semibold">Spending Trend</h2>
          <p className="mb-6 text-xs text-muted-foreground">Last 6 months</p>
          {loading ? (
            <Skeleton className="h-[260px] w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,22%)" />
                <XAxis dataKey="month" stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${symbol}${v / 1000}k`} />
                <Tooltip content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                      <p className="font-medium">{label}</p>
                      <p className="text-primary">{fmt(payload[0].value)}</p>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="amount" stroke="hsl(160,84%,39%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160,84%,39%)", stroke: "hsl(222,47%,14%)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="mb-1 font-display text-base font-semibold">Category Breakdown</h2>
          <p className="mb-6 text-xs text-muted-foreground">This month's spending</p>
          {loading ? (
            <Skeleton className="mx-auto h-[260px] w-[260px] rounded-full" />
          ) : breakdown.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No expenses this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} strokeWidth={0}>
                  {breakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ backgroundColor: "hsl(222,47%,14%)", border: "1px solid hsl(222,30%,22%)", borderRadius: "8px", fontSize: "13px", color: "hsl(0,0%,100%)" }} itemStyle={{ color: "hsl(0,0%,100%)" }} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Spending % Bar Chart */}
      {!loading && barData.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="mb-1 font-display text-base font-semibold">Spending by Category (%)</h2>
          <p className="mb-6 text-xs text-muted-foreground">Percentage of total expenses per category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,22%)" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} width={100} />
              <Tooltip formatter={(value: number) => `${value}%`} contentStyle={{ backgroundColor: "hsl(222,47%,14%)", border: "1px solid hsl(222,30%,22%)", borderRadius: "8px", fontSize: "13px", color: "hsl(0,0%,100%)" }} itemStyle={{ color: "hsl(0,0%,100%)" }} />
              <Bar dataKey="percent" radius={[0, 6, 6, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass-card overflow-hidden lg:col-span-3">
          <div className="px-6 pt-6 pb-2">
            <h2 className="font-display text-base font-semibold">Recent Expenses</h2>
            <p className="text-xs text-muted-foreground">Last 5 expenses</p>
          </div>
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : recentExpenses.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No expenses yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Description</th>
                    <th className="px-6 py-3 text-left font-medium">Category</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentExpenses.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-secondary/30">
                      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{tx.date}</td>
                      <td className="px-6 py-3 font-medium">{tx.description}</td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary" className={`text-xs ${getCategoryStyle(tx.category)}`}>{tx.category}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-display font-semibold">-{fmt(Number(tx.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="mb-1 font-display text-base font-semibold">Budget Progress</h2>
          <p className="mb-6 text-xs text-muted-foreground">Spend vs. limit by category</p>
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">No budgets set this month</div>
          ) : (
            <div className="space-y-5">
              {budgets.map((b) => {
                const pct = Math.min((b.spent / b.limit) * 100, 100);
                const over = b.spent > b.limit;
                return (
                  <div key={b.category}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className={`text-xs font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
                        {fmt(b.spent)} / {fmt(b.limit)}
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
