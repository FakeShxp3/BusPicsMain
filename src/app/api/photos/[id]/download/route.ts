import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedFileUrl } from "@/lib/photos-server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return new NextResponse("Photograph not found", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Authentication required", { status: 401 });
  }

  // Row Level Security means this only resolves for the owner.
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (!photo) {
    return new NextResponse("Photograph not found", { status: 404 });
  }

  const signedUrl = await getSignedFileUrl(
    photo.storage_path,
    photo.original_filename,
  );
  if (!signedUrl) {
    return new NextResponse("Could not create a download link", { status: 502 });
  }

  return NextResponse.redirect(signedUrl);
}
