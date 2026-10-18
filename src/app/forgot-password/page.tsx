import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ConfigError } from "@/components/common/config-error";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
