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

  const { data: currentCalled } = await supabaseAdmin
    .from("queue_entries")
    .select("id")
    .eq("store_id", store.id)
    .eq("status", "called");

  if (currentCalled && currentCalled.length > 0) {
    await supabaseAdmin
      .from("queue_entries")
      .update({ status: "served", served_at: new Date().toISOString() })
      .in(
        "id",
        currentCalled.map((row) => row.id)
      );
  }

  const { data: nextEntry, error: nextError } = await supabaseAdmin
    .from("queue_entries")
    .select("id,queue_number")
    .eq("store_id", store.id)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextError) {
    return NextResponse.json({ error: "No se pudo leer el siguiente turno." }, { status: 500 });
  }

  if (!nextEntry) {
    return NextResponse.json({
      storeName: store.name,
      called: null,
      message: "No hay personas esperando.",
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from("queue_entries")
    .update({ status: "called", called_at: new Date().toISOString() })
    .eq("id", nextEntry.id);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo llamar al siguiente turno." }, { status: 500 });
  }

  return NextResponse.json({
    storeName: store.name,
    called: nextEntry.queue_number,
    message: `Turno ${nextEntry.queue_number} llamado.`,
  });
}
