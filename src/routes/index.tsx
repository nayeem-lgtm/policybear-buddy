import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PolicyBearLogo } from "@/components/brand/PolicyBearLogo";
import { DEMO_ACCOUNTS } from "@/lib/rbac";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Policy Bear Operations CRM" },
      {
        name: "description",
        content:
          "Secure sign-in for the Policy Bear Operations CRM: shift control, sales pipeline, quoting, quality control and training in one workspace.",
      },
      { property: "og:title", content: "Sign in — Policy Bear Operations CRM" },
      {
        property: "og:description",
        content:
          "Secure sign-in for the Policy Bear Operations CRM: shift control, sales pipeline, quoting, quality control and training in one workspace.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, ready, signIn } = useAuth();
  const [email, setEmail] = useState("ceo@policybear.com");
  const [password, setPassword] = useState("Bear#CEO2026");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) void navigate({ to: user.landing, replace: true });
  }, [ready, user, navigate]);

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Sign in failed.");
      return;
    }
    setError(null);
    void navigate({ to: result.user?.landing ?? "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-navy p-10 lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-brand/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-cyan/20 blur-3xl" />
        <PolicyBearLogo tone="inverse" className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-brand-ink-foreground">
            One workspace for the whole floor.
          </h2>
          <p className="mt-3 text-sm text-brand-ink-foreground/70">
            Every department signs in with its own account and sees only the modules its
            role owns — from the sales floor to the CEO.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-ink-foreground/80">
            {[
              "Role-based access for Agents, QC, HR, Accounting, Operations",
              "Executive and administrator accounts see every module",
              "Break and lunch compliance with live escalation",
              "Multi-carrier quoting with bot-assisted submissions",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-yellow" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-ink-foreground/40">
          Authorized use only. All sessions are recorded for compliance.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <PolicyBearLogo />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your Policy Bear department account to continue.
          </p>

          <Card className="mt-6 gap-4 p-5 shadow-card">
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/"
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertCircle className="size-3.5" /> {error}
                </p>
              )}

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox defaultChecked /> Keep me signed in on this device
              </label>

              <Button type="submit" className="w-full">
                Continue <ArrowRight className="size-4" />
              </Button>
            </form>
          </Card>

          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Department demo accounts
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setError(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <Badge variant="secondary" className="shrink-0">
                      {account.role}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {account.email}
                    </span>
                    <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                      {account.password}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.65rem] text-muted-foreground">
              Demo credentials only — replace with the real identity API at launch.
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact IT Support at ext. 210 or{" "}
            <span className="text-brand">it@policybear.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
