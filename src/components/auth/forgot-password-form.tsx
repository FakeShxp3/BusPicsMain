"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CircleAlertIcon, LoaderCircleIcon, MailCheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
        },
      );
      if (resetError) {
        if (/rate limit|too many/i.test(resetError.message)) {
          setError("Too many reset requests. Wait a few minutes and try again.");
        } else {
          setError(resetError.message);
        }
        return;
      }
      setSent(true);
    } catch {
      setError("Unable to reach the authentication service. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="grid size-11 place-items-center rounded-lg border border-border bg-muted text-foreground">
          <MailCheckIcon className="size-5" strokeWidth={1.6} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email.trim()}</span>, a
            password reset link is on its way. The link expires after a short time.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeftIcon />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">Account recovery</p>
        <h1 className="text-[22px] font-semibold tracking-tight">Reset your password</h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Enter the email address for your archive and we will send a secure reset
          link.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
