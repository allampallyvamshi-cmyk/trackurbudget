import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedAccess } from "@/contexts/SharedAccessContext";
import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));

const categories = ["Food", "Housing", "Transport", "Entertainment", "Shopping", "Health", "Other"];
const paymentMethods = ["Cash", "Credit Card", "Debit Card", "UPI", "Bank Transfer"];

const categoryBadgeColors: Record<string, string> = {
  Food: "bg-blue-500/20 text-blue-400", Entertainment: "bg-purple-500/20 text-purple-400",
  Transport: "bg-yellow-500/20 text-yellow-400", Shopping: "bg-pink-500/20 text-pink-400",
  Housing: "bg-primary/20 text-primary", Health: "bg-red-500/20 text-red-400", Other: "bg-muted text-muted-foreground",
};

const SharedExpenses = () => {
  const { ownerName, callSharedAction, clearAccess } = useSharedAccess();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    description: "", amount: "", category: "Food", date: new Date().toISOString().split("T")[0],
    payment_method: "Cash", notes: "",
  });

  const loadExpenses = useCallback(async () => {
    try {
      const res = await callSharedAction("get_expenses");
      setExpenses(res.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [callSharedAction]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const onAdd = async () => {
    if (!form.description || !form.amount || !form.category) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    setAdding(true);
    try {
      await callSharedAction("add_expense", { ...form, amount: Number(form.amount) });
      toast({ title: "Expense added" });
      setAddOpen(false);
      setForm({ description: "", amount: "", category: "Food", date: new Date().toISOString().split("T")[0], payment_method: "Cash", notes: "" });
      loadExpenses();
    } catch {
      toast({ title: "Error adding expense", variant: "destructive" });
    } finally { setAdding(false); }
  };

  const onDelete = async (id: string) => {
    try {
      await callSharedAction("delete_expense", { id });
      toast({ title: "Expense deleted" });
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast({ title: "Error deleting expense", variant: "destructive" });
    }
  };

  const filtered = expenses.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <PageHead title={`${ownerName}'s Expenses`} />
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/shared/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">{ownerName}'s Expenses</h1>
              <p className="text-sm text-muted-foreground">Shared access</p>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                <div><Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div><Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                <Button className="w-full" onClick={onAdd} disabled={adding}>{adding ? "Adding..." : "Add Expense"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No expenses found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Description</th>
                  <th className="px-6 py-3 text-left font-medium">Category</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-secondary/30">
                      <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">{tx.date}</td>
                      <td className="px-6 py-3 font-medium">{tx.description}</td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary" className={`text-xs ${categoryBadgeColors[tx.category] || categoryBadgeColors.Other}`}>{tx.category}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-display font-semibold">-{fmt(Number(tx.amount))}</td>
                      <td className="px-6 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(tx.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
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

export default SharedExpenses;
