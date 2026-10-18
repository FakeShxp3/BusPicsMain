import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: isSupabaseConfigured ? "ok" : "configuration-required",
    configured: isSupabaseConfigured,
    time: new Date().toISOString(),
  });
}
