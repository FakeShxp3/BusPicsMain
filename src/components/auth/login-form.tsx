"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MailCheckIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check both and try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Your email address has not been confirmed yet. Check your inbox for the confirmation link.";
  }
  if (normalized.includes("already registered")) {
    return "An account with this email already exists. Switch to Sign in.";
  }
  if (normalized.includes("password should be at least")) {
    return "Passwords must be at least 8 characters long.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Wait a moment before trying again.";
  }
  if (normalized.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "Account creation is disabled for this project. Contact the project owner.";
  }
  return message;
}

function safeNextPath(value: string | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "auth_callback_failed"
      ? "The sign-in link is invalid or has expired. Request a new link and try again."
      : null,
  );
  const [pending, setPending] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const destination = safeNextPath(nextPath);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(authErrorMessage(signInError.message));
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: name.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
      if (signUpError) {
        setError(authErrorMessage(signUpError.message));
        return;
      }
      if (data.session) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setConfirmationEmail(email.trim());
    } catch {
      setError("Unable to reach the authentication service. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function resendConfirmation() {
    if (!confirmationEmail) return;
    setResending(true);
    setResent(false);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
      if (resendError) {
        setError(authErrorMessage(resendError.message));
        return;
      }
      setResent(true);
    } catch {
      setError("Could not resend the confirmation email. Try again shortly.");
    } finally {
      setResending(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className="space-y-5">
        <div className="grid size-11 place-items-center rounded-lg border border-border bg-muted text-foreground">
          <MailCheckIcon className="size-5" strokeWidth={1.6} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{confirmationEmail}</span>.
            Open it to finish creating your archive.
          </p>
        </div>
        {resent ? (
          <p className="rounded-md border border-success/25 bg-success/10 px-3 py-2 text-xs text-success">
            Confirmation email resent.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resendConfirmation}
            disabled={resending}
          >
            {resending ? <LoaderCircleIcon className="animate-spin" /> : null}
            Resend confirmation email
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setConfirmationEmail(null);
              setResent(false);
              setMode("signin");
            }}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="eyebrow">TransitSpotter</p>
        <h1 className="text-[22px] font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to your archive" : "Create your archive"}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {mode === "signin"
            ? "Your fleet records and photographs are private to your account."
            : "One account, one private archive. You can export everything at any time."}
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

      <Tabs
        value={mode}
        onValueChange={(value) => {
          setMode(value as Mode);
          setError(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-5">
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-[11.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <form onSubmit={handleSignUp} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Display name</Label>
              <Input
                id="signup-name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="How your archive greets you"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className={cn("pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use 8 or more characters. Your password is managed by Supabase Auth.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {pending ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By creating an account you agree to keep your archive private.
              Confirmation email may be required.
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
