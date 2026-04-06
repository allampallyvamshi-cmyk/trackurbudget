import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SharedAccessProvider } from "@/contexts/SharedAccessContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy-loaded pages
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Income = lazy(() => import("@/pages/Income"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const Advisor = lazy(() => import("@/pages/Advisor"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SharedDashboard = lazy(() => import("@/pages/SharedDashboard"));
const SharedExpenses = lazy(() => import("@/pages/SharedExpenses"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <HelmetProvider>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SharedAccessProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<ErrorBoundary><Landing /></ErrorBoundary>} />
                  <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
                  <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />
                  <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
                  <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
                  <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                  <Route path="/income" element={<ProtectedPage><Income /></ProtectedPage>} />
                  <Route path="/expenses" element={<ProtectedPage><Expenses /></ProtectedPage>} />
                  <Route path="/budgets" element={<ProtectedPage><Budgets /></ProtectedPage>} />
                  <Route path="/budget" element={<ProtectedPage><Budgets /></ProtectedPage>} />
                  <Route path="/advisor" element={<ProtectedPage><Advisor /></ProtectedPage>} />
                  <Route path="/ai-advisor" element={<ProtectedPage><Advisor /></ProtectedPage>} />
                  <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
                  <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
                  <Route path="/shared/dashboard" element={<ErrorBoundary><SharedDashboard /></ErrorBoundary>} />
                  <Route path="/shared/expenses" element={<ErrorBoundary><SharedExpenses /></ErrorBoundary>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SharedAccessProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
