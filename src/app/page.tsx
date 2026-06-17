import Link from "next/link";
import {
  Wallet,
  PieChart,
  Target,
  Repeat,
  Download,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: PieChart,
    title: "Interactive dashboard",
    desc: "Income vs. expenses, spending by category, and monthly trends — all updating with your filters.",
  },
  {
    icon: Wallet,
    title: "Track every transaction",
    desc: "Add, edit and categorize income and expenses with fast search, filters and sorting.",
  },
  {
    icon: Target,
    title: "Budgets & goals",
    desc: "Set monthly budgets per category and track progress toward your savings goals.",
  },
  {
    icon: Repeat,
    title: "Recurring transactions",
    desc: "Mark rent or salary as recurring and see upcoming entries automatically.",
  },
  {
    icon: Download,
    title: "Export to CSV",
    desc: "Download your filtered transactions any time for your own records.",
  },
  {
    icon: ShieldCheck,
    title: "Private & secure",
    desc: "Row-level security means you only ever see your own data.",
  },
];

const steps = [
  {
    title: "Sign in",
    desc: "Create a demo account in seconds — no real bank connection needed.",
  },
  {
    title: "Add transactions",
    desc: "Log income and expenses, mark recurring ones, and organize with categories.",
  },
  {
    title: "See the insights",
    desc: "Watch your dashboard, budgets, and savings goals update instantly.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold">
          <Wallet className="h-6 w-6 text-primary" /> FinTrack
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent),transparent)]"
          />
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Personal Finance Tracker
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Know exactly where your money goes.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            FinTrack turns your income and expenses into a clean, interactive
            dashboard — budgets, savings goals, and beautiful charts included.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="md" className="px-6">
                Try the live demo
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="md" className="px-6">
                Log in
              </Button>
            </Link>
          </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                How it works
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Up and running in three steps
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                No spreadsheets, no setup headaches. Start tracking your money in
                minutes.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="relative rounded-xl border border-border bg-card p-6"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-base font-bold text-primary">
                    {i + 1}
                  </div>
                  <h3 className="mb-1 font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to take control of your money?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Jump into the live demo with realistic sample data — no sign-up
              friction, nothing to lose.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup">
                <Button
                  size="md"
                  variant="outline"
                  className="border-transparent bg-white px-6 text-slate-900 hover:bg-white/90"
                >
                  Try the live demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-10 text-sm text-primary-foreground/70">
              Built with Next.js, Supabase & Recharts · Portfolio demo
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
