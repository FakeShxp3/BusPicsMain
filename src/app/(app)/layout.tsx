import { ConfigError } from "@/components/common/config-error";
import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { displayName, getViewer } from "@/lib/supabase/server";
import { getInitials } from "@/lib/utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  const viewer = await getViewer();
  const name = displayName(viewer.profile, viewer.email);

  return (
    <AppShell
      timeZone={viewer.timeZone}
      user={{
        name,
        email: viewer.email,
        initials: getInitials(name, viewer.email),
      }}
    >
      {children}
    </AppShell>
  );
}
