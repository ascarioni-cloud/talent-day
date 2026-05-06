import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isValidAdminPin(pin: string | null | undefined) {
  return Boolean(process.env.ADMIN_PIN) && pin === process.env.ADMIN_PIN;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const body = await request.json().catch(() => null);
  const pin = body?.pin;
  const isActive = Boolean(body?.is_active);
  const { storeId } = await params;

  if (!isValidAdminPin(pin)) {
    return NextResponse.json({ error: "PIN de administrador incorrecto." }, { status: 401 });
  }

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .update({ is_active: isActive })
    .eq("id", storeId)
    .select("id,slug,name,is_active,created_at")
    .single();

  if (error || !store) {
    return NextResponse.json({ error: "No se pudo actualizar la tienda." }, { status: 500 });
  }

  return NextResponse.json({ store });
}
