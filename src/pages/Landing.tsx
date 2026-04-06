import { useState } from "react";
import { Link } from "react-router-dom";
import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Menu,
  X,
  Brain,
  BarChart3,
  PieChart,
  Target,
  FileSpreadsheet,
  Zap,
  Star,
  Check,
  ArrowRight,
  Play,
  Twitter,
  Github,
  Linkedin,
} from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const features = [
  { icon: Zap, title: "Smart Expense Tracking", desc: "Automatically categorize and track every transaction in real-time with intelligent detection." },
  { icon: Brain, title: "AI Budget Advisor", desc: "Get personalized financial advice powered by OpenAI based on your spending patterns." },
  { icon: BarChart3, title: "Real-time Insights", desc: "Live dashboards that update instantly so you always know where your money goes." },
  { icon: PieChart, title: "Spending Analytics", desc: "Deep-dive into your habits with beautiful charts and breakdowns by category." },
  { icon: Target, title: "Goal Setting", desc: "Set savings goals and track your progress with smart milestones and alerts." },
  { icon: FileSpreadsheet, title: "CSV Export", desc: "Export your financial data anytime for tax prep, reports, or personal records." },
];

const steps = [
  { num: "01", title: "Create Your Account", desc: "Sign up in seconds. No credit card required to get started with the free plan." },
  { num: "02", title: "Track Your Spending", desc: "Add expenses manually or connect your accounts. Our AI auto-categorizes everything." },
  { num: "03", title: "Get AI Advice", desc: "Receive personalized budget recommendations and savings tips from our AI advisor." },
];

const testimonials = [
  { name: "Sarah Chen", role: "Product Designer", quote: "TrackYourBudget completely changed how I manage money. The AI advisor feels like having a personal financial coach.", rating: 5 },
  { name: "Marcus Johnson", role: "Freelance Developer", quote: "As a freelancer with irregular income, the smart budgeting tools help me plan ahead. Absolutely essential.", rating: 5 },
  { name: "Emily Rodriguez", role: "Marketing Manager", quote: "The spending analytics are incredible. I saved $400/month just by understanding my habits better.", rating: 5 },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for getting started",
    features: ["Track up to 50 expenses/mo", "Basic analytics", "1 budget category", "CSV export"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    desc: "For serious budgeters",
    features: ["Unlimited expenses", "AI Budget Advisor", "Advanced analytics", "Unlimited budgets", "Priority support"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$29.99",
    period: "/month",
    desc: "For teams & businesses",
    features: ["Everything in Pro", "Team collaboration", "API access", "Custom reports", "Dedicated support", "SSO integration"],
    cta: "Contact Sales",
    featured: false,
  },
];

const Landing = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHead title="AI Expense Tracker & Budget Advisor" description="Track expenses, set budgets, and get personalized AI-powered financial advice — all in one place." />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">TrackYourBudget</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground md:hidden">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background px-4 py-6 md:hidden">
            <div className="space-y-4">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                <Button variant="outline" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Zap className="h-4 w-4" /> AI-Powered Finance
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Take Control of Your Finances{" "}
              <span className="gradient-text">with AI</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Track expenses, set budgets, and get personalized AI-powered financial advice — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" className="gap-2 text-base" asChild>
                <Link to="/register">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base">
                <Play className="h-4 w-4" /> Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> Free forever plan</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> No credit card</span>
            </div>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="overflow-hidden rounded-2xl border border-border shadow-2xl glow-border">
              <img src={dashboardMockup} alt="TrackYourBudget dashboard preview" className="w-full" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Everything You Need to <span className="gradient-text">Master Your Money</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Powerful tools designed to give you complete visibility and control over your financial life.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:glow-border animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Get started in minutes. No complicated setup, no learning curve.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-display text-2xl font-bold text-primary">{s.num}</span>
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-8 hidden h-px w-1/3 bg-gradient-to-r from-primary/30 to-transparent md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              See what our users have to say about transforming their finances.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="glass-card p-6 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display font-semibold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Simple, Transparent <span className="gradient-text">Pricing</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Start free, upgrade when you're ready. No hidden fees.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p, i) => (
              <div
                key={p.name}
                className={`glass-card relative overflow-hidden p-8 transition-all duration-300 hover:-translate-y-1 animate-fade-in ${
                  p.featured ? "border-primary/50 glow-border" : ""
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {p.featured && (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Popular
                  </div>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={p.featured ? "default" : "outline"}
                  asChild
                >
                  <Link to="/register">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="glass-card border-primary/20 p-12 glow-border">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to Take Control?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of users who are already saving more and spending smarter with TrackYourBudget.
            </p>
            <Button size="lg" className="mt-8 gap-2 text-base" asChild>
              <Link to="/register">
                Get Started for Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <DollarSign className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold">TrackYourBudget</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                AI-powered expense tracking and budget management for everyone.
              </p>
              <div className="mt-4 flex gap-3">
                <a href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground transition-colors hover:text-primary">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "GDPR"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 font-display text-sm font-semibold">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} TrackYourBudget. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
