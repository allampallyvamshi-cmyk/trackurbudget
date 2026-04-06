import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedAccess } from "@/contexts/SharedAccessContext";
import PageHead from "@/components/PageHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));

const categoryColors: Record<string, string> = {
  Food: "hsl(200, 80%, 50%)", Housing: "hsl(160, 84%, 39%)", Transport: "hsl(45, 90%, 55%)",
  Entertainment: "hsl(280, 60%, 55%)", Shopping: "hsl(340, 75%, 55%)", Health: "hsl(0, 70%, 55%)", Other: "hsl(215, 20%, 50%)",
};

const categoryBadgeColors: Record<string, string> = {
  Food: "bg-blue-500/20 text-blue-400", Income: "bg-primary/20 text-primary",
  Entertainment: "bg-purple-500/20 text-purple-400", Transport: "bg-yellow-500/20 text-yellow-400",
  Shopping: "bg-pink-500/20 text-pink-400", Housing: "bg-primary/20 text-primary", Other: "bg-muted text-muted-foreground",
};

const SharedDashboard = () => {
  const { ownerName, callSharedAction, clearAccess } = useSharedAccess();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await callSharedAction("get_dashboard");
        setDashData(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [callSharedAction]);

  const expenses = dashData?.expenses || [];
  const budgets = dashData?.budgets || [];
  const recent = dashData?.recent || [];
  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);

  const catMap: Record<string, number> = {};
  expenses.forEach((e: any) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });
  const breakdown = Object.entries(catMap).map(([category, amount]) => ({
    category, amount, color: categoryColors[category] || categoryColors.Other,
  }));

  const budgetItems = budgets.map((b: any) => ({
    category: b.category, limit: Number(b.amount_limit), spent: catMap[b.category] || 0,
  }));

  const handleExit = () => { clearAccess(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <PageHead title={`${ownerName}'s Dashboard`} />
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{ownerName}'s Dashboard</h1>
            <p className="text-sm text-muted-foreground">Shared access · View & manage expenses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/shared/expenses")}>View Expenses</Button>
            <Button variant="ghost" size="sm" onClick={handleExit}><LogOut className="mr-1 h-4 w-4" /> Exit</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "This Month", value: fmt(total), icon: TrendingDown },
            { label: "Categories", value: String(breakdown.length), icon: Wallet },
            { label: "Budgets Set", value: String(budgetItems.length), icon: PiggyBank },
          ].map((s) => (
            <div key={s.label} className="glass-card p-5">
              {loading ? <Skeleton className="h-16 w-full" /> : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Chart + Recent */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h2 className="mb-1 font-display text-base font-semibold">Category Breakdown</h2>
            <p className="mb-4 text-xs text-muted-foreground">This month</p>
            {loading ? <Skeleton className="mx-auto h-[240px] w-[240px] rounded-full" /> :
              breakdown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No expenses this month</p> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                      {breakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(222,47%,14%)", border: "1px solid hsl(222,30%,22%)", borderRadius: "8px", fontSize: "13px" }} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <h2 className="font-display text-base font-semibold">Recent Expenses</h2>
              <p className="text-xs text-muted-foreground">Last 5</p>
            </div>
            {loading ? (
              <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : recent.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No expenses yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-muted-foreground">
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Description</th>
                    <th className="px-6 py-3 text-left font-medium">Category</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {recent.map((tx: any) => (
                      <tr key={tx.id} className="transition-colors hover:bg-secondary/30">
                        <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{tx.date}</td>
                        <td className="px-6 py-3 font-medium">{tx.description}</td>
                        <td className="px-6 py-3">
                          <Badge variant="secondary" className={`text-xs ${categoryBadgeColors[tx.category] || categoryBadgeColors.Other}`}>{tx.category}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-display font-semibold">-{fmt(Number(tx.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Budget Progress */}
        {budgetItems.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="mb-1 font-display text-base font-semibold">Budget Progress</h2>
            <p className="mb-4 text-xs text-muted-foreground">Spend vs. limit</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgetItems.map((b: any) => {
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedDashboard;
