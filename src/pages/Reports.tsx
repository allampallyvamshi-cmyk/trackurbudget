import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageHead from "@/components/PageHead";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, PiggyBank, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";


const categoryColors: Record<string, string> = {
  Housing: "hsl(160, 84%, 39%)", Food: "hsl(200, 80%, 50%)", Transport: "hsl(45, 90%, 55%)",
  Entertainment: "hsl(280, 60%, 55%)", Shopping: "hsl(340, 75%, 55%)", Health: "hsl(0, 70%, 55%)", Other: "hsl(215, 20%, 50%)",
};

const ChartTooltip = ({ active, payload, label, fmt }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ── Tab 1: Overview ────────────────────────────────────
const OverviewTab = () => {
  const [data, setData] = useState<{ month: string; expenses: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt, symbol } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const result: { month: string; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const { data } = await supabase.from("expenses").select("amount")
          .gte("date", format(startOfMonth(m), "yyyy-MM-dd"))
          .lte("date", format(endOfMonth(m), "yyyy-MM-dd"));
        result.push({ month: format(m, "MMM"), expenses: (data || []).reduce((s, e) => s + Number(e.amount), 0) });
      }
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, []);

  const highestSpend = [...data].sort((a, b) => b.expenses - a.expenses)[0];
  const lowestSpend = [...data].sort((a, b) => a.expenses - b.expenses)[0];
  const avgSpend = data.reduce((s, d) => s + d.expenses, 0) / (data.length || 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <KpiCard label="Highest Spending Month" value={highestSpend?.month || "—"} sub={fmt(highestSpend?.expenses || 0)} icon={TrendingUp} accent />
            <KpiCard label="Lowest Spending Month" value={lowestSpend?.month || "—"} sub={fmt(lowestSpend?.expenses || 0)} icon={PiggyBank} />
            <KpiCard label="Avg Monthly Spend" value={fmt(avgSpend)} sub="across 6 months" icon={DollarSign} />
          </>
        )}
      </div>
      <div className="glass-card p-6">
        <h3 className="mb-1 font-display text-base font-semibold">Monthly Expenses</h3>
        <p className="mb-6 text-xs text-muted-foreground">Last 6 months</p>
        {loading ? <Skeleton className="h-[300px] rounded-lg" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,22%)" />
              <XAxis dataKey="month" stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} />
               <YAxis stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${symbol}${v / 1000}k`} />
               <Tooltip content={<ChartTooltip fmt={fmt} />} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ── Tab 2: Category Analysis ───────────────────────────
const CategoryTab = () => {
  const [data, setData] = useState<{ category: string; totalSpent: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const { data: expenses } = await supabase.from("expenses").select("amount, category")
        .gte("date", format(startOfMonth(now), "yyyy-MM-dd"))
        .lte("date", format(endOfMonth(now), "yyyy-MM-dd"));

      const catMap: Record<string, number> = {};
      (expenses || []).forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });

      setData(Object.entries(catMap).map(([category, totalSpent]) => ({
        category, totalSpent, color: categoryColors[category] || categoryColors.Other,
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="mb-1 font-display text-base font-semibold">Spending Distribution</h3>
          <p className="mb-4 text-xs text-muted-foreground">This month</p>
          {loading ? <Skeleton className="mx-auto h-[250px] w-[250px] rounded-full" /> : data.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data} dataKey="totalSpent" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(222,47%,14%)", border: "1px solid hsl(222,30%,22%)", borderRadius: "8px", fontSize: "13px" }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass-card overflow-hidden lg:col-span-3">
          <div className="px-6 pt-6 pb-2"><h3 className="font-display text-base font-semibold">Category Breakdown</h3></div>
          {loading ? <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground"><th className="px-6 py-3 text-left font-medium">Category</th><th className="px-6 py-3 text-right font-medium">Total Spent</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {data.map((d) => (
                    <tr key={d.category} className="hover:bg-secondary/30">
                      <td className="px-6 py-3 font-medium"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.category}</div></td>
                      <td className="px-6 py-3 text-right font-display font-semibold">{fmt(d.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tab 3: Trends ──────────────────────────────────────
const TrendsTab = () => {
  const [months, setMonths] = useState(6);
  const [trend, setTrend] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt, symbol } = useCurrency();

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const result: { month: string; amount: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(now, i);
      const { data } = await supabase.from("expenses").select("amount")
        .gte("date", format(startOfMonth(m), "yyyy-MM-dd"))
        .lte("date", format(endOfMonth(m), "yyyy-MM-dd"));
      result.push({ month: format(m, "MMM"), amount: (data || []).reduce((s, e) => s + Number(e.amount), 0) });
    }
    setTrend(result);
    setLoading(false);
  }, [months]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2">
        {[3, 6, 12].map((m) => <Button key={m} size="sm" variant={months === m ? "default" : "outline"} onClick={() => setMonths(m)}>{m} Months</Button>)}
      </div>
      <div className="glass-card p-6">
        <h3 className="mb-1 font-display text-base font-semibold">Spending Trend</h3>
        <p className="mb-6 text-xs text-muted-foreground">Last {months} months</p>
        {loading ? <Skeleton className="h-[280px] rounded-lg" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,22%)" />
              <XAxis dataKey="month" stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} />
               <YAxis stroke="hsl(215,20%,65%)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${symbol}${v / 1000}k`} />
               <Tooltip content={<ChartTooltip fmt={fmt} />} />
               <Line type="monotone" dataKey="amount" name="Spending" stroke="hsl(160,84%,39%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160,84%,39%)", stroke: "hsl(222,47%,14%)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ── Tab 4: Export ───────────────────────────────────────
const ExportTab = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) { toast({ title: "Select both dates", variant: "destructive" }); return; }
    setExporting(true);
    const { data, error } = await supabase.from("expenses").select("*")
      .gte("date", format(startDate, "yyyy-MM-dd"))
      .lte("date", format(endDate, "yyyy-MM-dd"))
      .order("date", { ascending: false });

    if (error) { toast({ title: "Export failed", variant: "destructive" }); setExporting(false); return; }

    const csv = ["Date,Description,Category,Payment Method,Amount,Notes"];
    (data || []).forEach((e) => csv.push(`${e.date},"${e.description}",${e.category},${e.payment_method},${e.amount},"${e.notes || ""}"`));
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
    setExporting(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="glass-card mx-auto max-w-lg p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Download className="h-7 w-7 text-primary" /></div>
          <h3 className="font-display text-xl font-semibold">Export Report</h3>
          <p className="mt-1 text-sm text-muted-foreground">Download your financial data as a CSV file</p>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
            <DatePickerField label="End Date" value={endDate} onChange={setEndDate} />
          </div>
          {startDate && endDate && (
            <div className="rounded-lg bg-secondary/50 p-3 text-center text-sm text-muted-foreground">{format(startDate, "MMM d, yyyy")} — {format(endDate, "MMM d, yyyy")}</div>
          )}
          <Button className="w-full gap-2" onClick={handleExport} disabled={!startDate || !endDate || exporting}>
            <Download className="h-4 w-4" />{exporting ? "Exporting..." : "Export as CSV"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Shared sub-components ──────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub: string; icon: React.ElementType; accent?: boolean }) => (
  <div className="glass-card flex items-center gap-4 p-5">
    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", accent ? "bg-destructive/10" : "bg-primary/10")}>
      <Icon className={cn("h-6 w-6", accent ? "text-destructive" : "text-primary")} />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  </div>
);

const DatePickerField = ({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />{value ? format(value, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  </div>
);

// ── Main Reports Page ──────────────────────────────────
const Reports = () => (
  <div className="space-y-6 animate-fade-in">
    <PageHead title="Reports" description="Analyze your financial data" />
    <div className="flex items-center gap-3">
      <BarChart3 className="h-6 w-6 text-primary" />
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Analyze your financial data</p>
      </div>
    </div>
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-secondary/50">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="category">Category Analysis</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab /></TabsContent>
      <TabsContent value="category"><CategoryTab /></TabsContent>
      <TabsContent value="trends"><TrendsTab /></TabsContent>
      <TabsContent value="export"><ExportTab /></TabsContent>
    </Tabs>
  </div>
);

export default Reports;
