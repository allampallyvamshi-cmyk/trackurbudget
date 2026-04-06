import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import ImportExpensesModal from "@/components/ImportExpensesModal";
import { supabase } from "@/integrations/supabase/client";
import PageHead from "@/components/PageHead";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Pencil, Trash2, Download, Upload, CalendarIcon, ChevronLeft, ChevronRight, Filter, X,
} from "lucide-react";
import ExpenseForm, { categories, type ExpenseFormValues } from "@/components/ExpenseForm";

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  payment_method: string;
  notes?: string;
}

const categoryStyle: Record<string, string> = {
  Food: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Transport: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Housing: "bg-primary/15 text-primary border-primary/20",
  Entertainment: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Health: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  Shopping: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Other: "bg-muted text-muted-foreground border-border",
};

const categoryEmoji: Record<string, string> = {
  Food: "🍔", Transport: "🚗", Housing: "🏠", Entertainment: "🎬", Health: "💊", Shopping: "🛍️", Other: "📦",
};


const PAGE_SIZE = 10;
const MAX_FILTER_AMOUNT = 100000;

const Expenses = () => {
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [amountRange, setAmountRange] = useState<[number, number]>([0, MAX_FILTER_AMOUNT]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("expenses").select("*", { count: "exact" });

    if (search) query = query.ilike("description", `%${search}%`);
    if (filterCategory) query = query.eq("category", filterCategory);
    if (dateRange.from) query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange.to) query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));

    query = query.order("date", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      toast({ title: "Failed to load expenses", variant: "destructive" });
    } else {
      setExpenses((data || []).map((e) => ({ ...e, amount: Number(e.amount) })));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [page, search, filterCategory, dateRange, toast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openAdd = () => { setEditingExpense(null); setDrawerOpen(true); };
  const openEdit = (exp: Expense) => { setEditingExpense(exp); setDrawerOpen(true); };

  const handleFormSubmit = async (data: ExpenseFormValues) => {
    setFormLoading(true);
    const body = {
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: format(data.date, "yyyy-MM-dd"),
      payment_method: data.paymentMethod,
      notes: data.notes || null,
    };
    try {
      if (editingExpense) {
        const { error } = await supabase.from("expenses").update(body).eq("id", editingExpense.id);
        if (error) throw error;
        toast({ title: "Expense updated" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("expenses").insert({ ...body, user_id: user!.id });
        if (error) throw error;
        toast({ title: "Expense added" });
      }
      setDrawerOpen(false);
      setEditingExpense(null);
      fetchExpenses();

      // Check if this expense pushes any budget over the limit
      const now = new Date();
      const monthKey = format(now, "yyyy-MM");
      const [budgetRes, expensesRes] = await Promise.all([
        supabase.from("budgets").select("category, amount_limit").eq("month", monthKey),
        supabase.from("expenses").select("amount, category").gte("date", format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")).lte("date", format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")),
      ]);
      if (budgetRes.data && expensesRes.data) {
        const catTotals: Record<string, number> = {};
        const totalSpent = expensesRes.data.reduce((s, e) => {
          catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
          return s + Number(e.amount);
        }, 0);
        budgetRes.data.forEach((b) => {
          if (b.category === "__monthly__") {
            if (totalSpent > Number(b.amount_limit)) {
              toast({ title: "⚠️ Monthly Budget Exceeded", description: `Total spending ${fmt(totalSpent)} exceeds your ${fmt(Number(b.amount_limit))} monthly limit.`, variant: "destructive" });
            }
          } else {
            const spent = catTotals[b.category] || 0;
            if (spent > Number(b.amount_limit)) {
              toast({ title: `⚠️ ${b.category} Budget Exceeded`, description: `You've spent ${fmt(spent)} of your ${fmt(Number(b.amount_limit))} budget.`, variant: "destructive" });
            }
          }
        });
      }
    } catch {
      toast({ title: editingExpense ? "Failed to update" : "Failed to add", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast({ title: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Expense deleted" }); fetchExpenses(); }
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase.from("expenses").delete().in("id", Array.from(selected));
    if (error) toast({ title: "Bulk delete failed", variant: "destructive" });
    else { toast({ title: `${selected.size} expense(s) deleted` }); setSelected(new Set()); setBulkDeleteOpen(false); fetchExpenses(); }
  };

  const handleExport = () => {
    const csv = ["Date,Description,Category,Payment Method,Amount,Notes"];
    expenses.forEach((e) => csv.push(`${e.date},"${e.description}",${e.category},${e.payment_method},${e.amount},"${e.notes || ""}"`));
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const allSelected = expenses.length > 0 && expenses.every((e) => selected.has(e.id));
  const toggleAll = () => { setSelected(allSelected ? new Set() : new Set(expenses.map((e) => e.id))); };
  const toggleOne = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); };

  const visibleExpenses = expenses.filter((e) => e.amount >= amountRange[0] && e.amount <= amountRange[1]);
  const clearFilters = () => { setFilterCategory(""); setDateRange({}); setAmountRange([0, MAX_FILTER_AMOUNT]); setSearch(""); setPage(0); };
  const hasActiveFilters = !!filterCategory || !!dateRange.from || !!dateRange.to || amountRange[0] > 0 || amountRange[1] < MAX_FILTER_AMOUNT;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHead title="Expenses" description="Track and manage your expenses" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{totalCount} total expenses</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete ({selected.size})</Button>
          )}
          <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Expense</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
        </div>
        <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> Filters
          {hasActiveFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">!</span>}
        </Button>
        {hasActiveFilters && <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Clear</Button>}
      </div>

      {showFilters && (
        <div className="glass-card grid gap-4 p-4 sm:grid-cols-3 animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal text-xs", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {dateRange.from ? format(dateRange.from, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.from} onSelect={(d) => { setDateRange((prev) => ({ ...prev, from: d })); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal text-xs", !dateRange.to && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {dateRange.to ? format(dateRange.to, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.to} onSelect={(d) => { setDateRange((prev) => ({ ...prev, to: d })); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount: {fmt(amountRange[0])} – {fmt(amountRange[1])}</label>
            <Slider min={0} max={MAX_FILTER_AMOUNT} step={50} value={amountRange} onValueChange={(v) => setAmountRange(v as [number, number])} className="mt-3" />
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No expenses found</p>
            <Button variant="link" className="mt-2 text-primary" onClick={openAdd}>Add your first expense</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="w-10 px-4 py-3"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="w-24 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleExpenses.map((exp) => (
                  <tr key={exp.id} className={cn("transition-colors hover:bg-secondary/30", selected.has(exp.id) && "bg-primary/5")}>
                    <td className="px-4 py-3"><Checkbox checked={selected.has(exp.id)} onCheckedChange={() => toggleOne(exp.id)} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{exp.date}</td>
                    <td className="px-4 py-3 font-medium">{exp.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-xs", categoryStyle[exp.category] || categoryStyle.Other)}>
                        {categoryEmoji[exp.category] || "📦"} {exp.category}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{exp.payment_method}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-display font-semibold">-{fmt(exp.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(exp)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(exp.id)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = page < 3 ? i : page - 2 + i;
                if (pageNum >= totalPages) return null;
                return <Button key={pageNum} variant={pageNum === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(pageNum)}>{pageNum + 1}</Button>;
              })}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display">{editingExpense ? "Edit Expense" : "Add Expense"}</SheetTitle>
            <SheetDescription>{editingExpense ? "Update the expense details below." : "Fill in the details to record a new expense."}</SheetDescription>
          </SheetHeader>
          <ExpenseForm
            key={editingExpense?.id ?? "new"}
            defaultValues={editingExpense ? {
              amount: editingExpense.amount,
              description: editingExpense.description,
              category: editingExpense.category,
              date: new Date(editingExpense.date),
              paymentMethod: editingExpense.payment_method,
              notes: editingExpense.notes || "",
            } : undefined}
            onSubmit={handleFormSubmit}
            submitLabel={editingExpense ? "Update Expense" : "Add Expense"}
            loading={formLoading}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete {selected.size} expense(s)?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportExpensesModal open={importOpen} onOpenChange={setImportOpen} onImportSuccess={fetchExpenses} />
    </div>
  );
};

export default Expenses;
