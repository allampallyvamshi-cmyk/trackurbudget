import { useState } from "react";
import PageHead from "@/components/PageHead";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedAccess } from "@/contexts/SharedAccessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Eye, EyeOff, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"login" | "code">("login");
  const [accessCode, setAccessCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const { login } = useAuth();
  const { validateCode } = useSharedAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast({ title: "Please enter an access code", variant: "destructive" });
      return;
    }
    setCodeLoading(true);
    const valid = await validateCode(accessCode.trim());
    setCodeLoading(false);
    if (valid) {
      navigate("/shared/dashboard");
    } else {
      toast({ title: "Invalid access code", description: "Please check the code and try again.", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await login(result.data.email, result.data.password);
      navigate(from, { replace: true });
    } catch {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <PageHead title="Sign In" />
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-border">
            <DollarSign className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your TrackYourBudget account</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "code" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            <KeyRound className="mr-1 inline h-4 w-4" /> Access Code
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="glass-card space-y-5 p-8" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="glass-card space-y-5 p-8" noValidate>
            <div className="space-y-2">
              <Label htmlFor="access-code">Access Code</Label>
              <Input
                id="access-code"
                type="text"
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="text-center tracking-widest text-lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter a shared access code to view and manage expenses without signing in.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={codeLoading}>
              {codeLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...</> : "Access Dashboard"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have a code?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>{" "}
              to create your own account.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
