import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `staff/${params.id}.${ext}`;

  const supabase = createAdminSupabase();
  const { error: uploadError } = await supabase.storage
    .from("staff-photos")
    .upload(path, file, { upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("staff-photos").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ photo_url: urlData.publicUrl })
    .eq("id", params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ url: urlData.publicUrl });
}
