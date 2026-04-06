import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import PageHead from "@/components/PageHead";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Briefcase,
} from "lucide-react";

interface IncomeRecord {
  id: string;
  amount: number;
  month: string;
  source: string;
}

const SOURCES = ["Salary", "Freelance", "Business", "Investments", "Rental", "Other"];

const Income = () => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Salary");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { fmt } = useCurrency();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("income")
      .select("*")
      .order("month", { ascending: false })
      .limit(12);
    if (error) {
      toast({ title: "Error loading income", variant: "destructive" });
    } else {
      setRecords(
        (data || []).map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          month: r.month,
          source: r.source,
        }))
      );
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (editingId) {
      const { error } = await supabase
        .from("income")
        .update({ amount: numAmount, source, month })
        .eq("id", editingId);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Income updated" });
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from("income").insert({
        user_id: user.id,
        amount: numAmount,
        month,
        source,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Income already set for this month", description: "Edit the existing entry instead.", variant: "destructive" });
        } else {
          toast({ title: "Failed to add income", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Income added" });
      }
    }

    setAmount("");
    setSource("Salary");
    setMonth(format(new Date(), "yyyy-MM"));
    setSaving(false);
    fetchRecords();
  };

  const handleEdit = (r: IncomeRecord) => {
    setEditingId(r.id);
    setAmount(String(r.amount));
    setSource(r.source);
    setMonth(r.month);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("income").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      toast({ title: "Income deleted" });
      if (editingId === id) setEditingId(null);
      fetchRecords();
    }
  };

  // Generate month options (current + last 11 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHead title="Income" description="Track your monthly income" />

      {/* Form */}
      <div className="glass-card p-6">
        <h2 className="mb-4 font-display text-base font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          {editingId ? "Edit Income" : "Add Monthly Income"}
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="income-month">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="income-month" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="income-amount">Amount</Label>
            <Input
              id="income-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="income-source">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="income-source" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {editingId ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        {editingId && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setEditingId(null); setAmount(""); }}>
            Cancel editing
          </Button>
        )}
      </div>

      {/* Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="font-display text-base font-semibold">Income History</h2>
          <p className="text-xs text-muted-foreground">Last 12 months</p>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No income records yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Month</th>
                  <th className="px-6 py-3 text-left font-medium">Source</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-6 py-3 text-muted-foreground">{r.month}</td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className="text-xs">{r.source}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right font-display font-semibold text-primary">
                      +{fmt(r.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Income;
