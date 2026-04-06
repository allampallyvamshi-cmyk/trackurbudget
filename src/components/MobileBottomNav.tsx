import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Target,
  Bot,
  BarChart3,
  Briefcase,
} from "lucide-react";

const navItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Income", url: "/income", icon: Briefcase },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Budget", url: "/budget", icon: Target },
  { title: "AI", url: "/ai-advisor", icon: Bot },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
      {navItems.map((item) => {
        const active = location.pathname === item.url;
        return (
          <button
            key={item.url}
            onClick={() => navigate(item.url)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", active && "text-primary")} />
            {item.title}
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
