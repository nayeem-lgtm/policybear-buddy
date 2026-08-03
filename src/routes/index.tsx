import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PolicyBearLogo } from "@/components/brand/PolicyBearLogo";

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
        content: "One workspace for Policy Bear sales, service, QC, HR and finance teams.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("dana.reyes@policybear.com");
  const [password, setPassword] = useState("demo-password");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-navy p-10 lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-brand/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-cyan/20 blur-3xl" />
        <PolicyBearLogo tone="inverse" className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-white">
            One workspace for the whole floor.
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Shift control, live pipeline, multi-carrier quoting, bot-assisted submissions,
            quality control, training and payroll — connected through a single API layer.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              "Break and lunch compliance with live escalation",
              "Multi-carrier quote comparison in one pull",
              "Automated application submission with OTP retrieval",
              "Training courses, exams and surveys tracked per agent",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-yellow" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">
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
            Use your Policy Bear work account to continue.
          </p>

          <Card className="mt-6 gap-4 p-5 shadow-card">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({ to: "/mfa" });
              }}
            >
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
                    to="/forgot-password"
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

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox defaultChecked /> Keep me signed in on this device
              </label>

              <Button type="submit" className="w-full">
                Continue <ArrowRight className="size-4" />
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact IT Support at ext. 210 or{" "}
            <span className="text-brand">it@policybear.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
