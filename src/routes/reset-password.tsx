import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — ResumeRoute" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const hasValidToken = useMemo(() => typeof window !== "undefined" && window.location.hash.includes("type=recovery"), []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timeout);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast.error("Password needs 8+ characters, one uppercase letter, and one number.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Password updated. Please sign in with your new password.");
    navigate({ to: "/login" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Logo className="[&_span:last-child]:text-primary-foreground [&_span:first-child]:bg-white [&_span:first-child]:text-primary" />
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Choose a fresh password.</h2>
          <p className="mt-3 max-w-sm text-primary-foreground/80">Use a strong password to keep your account protected.</p>
        </div>
        <p className="text-xs text-primary-foreground/70">© ResumeRoute</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden"><Logo /></div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a new password for your account.</p>

          {!ready ? (
            <p className="mt-8 text-sm text-muted-foreground">Preparing your secure reset session…</p>
          ) : !hasValidToken ? (
            <div className="mt-8 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              This link is invalid or has expired. Please request a fresh password reset email.
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
