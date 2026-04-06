import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, User, Settings, LogOut, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import ExpenseForm from "@/components/ExpenseForm";
import { useToast } from "@/hooks/use-toast";

interface TopHeaderProps {
  title: string;
}

const TopHeader = ({ title }: TopHeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAddExpense = async (data: any) => {
    setExpenseLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const body = {
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: format(data.date, "yyyy-MM-dd"),
        payment_method: data.paymentMethod,
        notes: data.notes || null,
        user_id: authUser!.id,
      };
      const { error } = await supabase.from("expenses").insert(body);
      if (error) throw error;
      toast({ title: "Expense added!" });
      setExpenseOpen(false);
      // Reload to refresh data
      window.location.reload();
    } catch {
      toast({ title: "Failed to add expense", variant: "destructive" });
    } finally {
      setExpenseLoading(false);
    }
  };

  const initials = `${(user?.firstName || "?")[0]}${(user?.lastName || "?")[0]}`.toUpperCase();

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpenseOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Expense</span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/settings")}>
                <User className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            onSubmit={handleAddExpense}
            submitLabel="Add Expense"
            loading={expenseLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TopHeader;
