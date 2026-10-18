import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { ConfigError } from "@/components/common/config-error";
import { isSupabaseConfigured } from "@/lib/env";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  const user = await getAuthUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;

  return (
    <AuthLayout>
      <LoginForm nextPath={params.next} initialError={params.error} />
    </AuthLayout>
  );
}
