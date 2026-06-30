import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Forgot password — ResumeRoute" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    const { error } = await forgotPassword(normalizedEmail);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("A reset link has been sent to your inbox.");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Logo className="[&_span:last-child]:text-primary-foreground [&_span:first-child]:bg-white [&_span:first-child]:text-primary" />
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Reset your access in minutes.</h2>
          <p className="mt-3 max-w-sm text-primary-foreground/80">We’ll send a secure link to help you create a new password.</p>
        </div>
        <p className="text-xs text-primary-foreground/70">© ResumeRoute</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden"><Logo /></div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the email on your account and we’ll send instructions.</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
