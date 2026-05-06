import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isValidPin(pin: string) {
  return Boolean(process.env.STAFF_PIN) && pin === process.env.STAFF_PIN;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const storeSlug = body?.storeSlug;
  const pin = body?.pin;

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  if (!storeSlug) {
    return NextResponse.json({ error: "Falta storeSlug." }, { status: 400 });
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,name")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("queue_entries")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("store_id", store.id)
    .in("status", ["waiting", "called"]);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo vaciar la cola." }, { status: 500 });
  }

  return NextResponse.json({
    storeName: store.name,
    message: "Cola vaciada.",
  });
}
