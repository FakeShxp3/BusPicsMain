import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ConfigError } from "@/components/common/config-error";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  const user = await getAuthUser();

  return (
    <AuthLayout>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-5">
          <p className="eyebrow">Account recovery</p>
          <h1 className="text-xl font-semibold tracking-tight">
            This reset link is no longer valid
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Recovery links are single-use and expire quickly. Request a fresh link
            to choose a new password.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
