import { useState } from "react";
import PageHead from "@/components/PageHead";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(50, "First name too long"),
    lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name too long"),
    email: z.string().trim().email("Please enter a valid email").max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const Register = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        if (key && !fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await register(result.data.firstName, result.data.lastName, result.data.email, result.data.password);
      navigate("/dashboard", { replace: true });
    } catch {
      toast({
        title: "Registration failed",
        description: "Could not create your account. The email might already be in use.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValue = form.password;
  const strengthChecks = [
    { label: "8+ characters", pass: passwordValue.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(passwordValue) },
    { label: "Number", pass: /[0-9]/.test(passwordValue) },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <PageHead title="Create Account" />
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-muted-foreground">Start tracking your finances with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-8" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" value={form.firstName} onChange={set("firstName")} className={errors.firstName ? "border-destructive" : ""} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" value={form.lastName} onChange={set("lastName")} className={errors.lastName ? "border-destructive" : ""} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} className={errors.email ? "border-destructive" : ""} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} className={errors.password ? "border-destructive" : ""} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            {passwordValue.length > 0 && (
              <div className="mt-2 flex gap-3">
                {strengthChecks.map((c) => (
                  <span key={c.label} className={`text-xs ${c.pass ? "text-primary" : "text-muted-foreground"}`}>
                    {c.pass ? "✓" : "○"} {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} className={errors.confirmPassword ? "border-destructive" : ""} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
