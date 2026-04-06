import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopHeader from "@/components/TopHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/expenses": "Expenses",
  "/budgets": "Budget",
  "/budget": "Budget",
  "/advisor": "AI Advisor",
  "/ai-advisor": "AI Advisor",
  "/reports": "Reports",
  "/settings": "Settings",
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "TrackYourBudget";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex flex-1 flex-col">
          <TopHeader title={title} />
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6 lg:p-8">{children}</main>
        </div>
        {/* Bottom nav on mobile */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
