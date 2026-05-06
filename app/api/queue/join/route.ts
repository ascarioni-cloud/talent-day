import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const storeSlug = body?.storeSlug;
  const visitorToken = body?.visitorToken;

  if (!storeSlug || !visitorToken) {
    return NextResponse.json({ error: "Faltan datos para entrar en la cola." }, { status: 400 });
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,name,slug,is_active")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Tienda no encontrada o inactiva." }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from("queue_entries")
    .select("id,status,queue_number,joined_at")
    .eq("store_id", store.id)
    .eq("visitor_token", visitorToken)
    .in("status", ["waiting", "called"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { count: peopleAhead } = await supabaseAdmin
      .from("queue_entries")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("status", "waiting")
      .lt("joined_at", existing.joined_at);

    return NextResponse.json({
      storeName: store.name,
      entryId: existing.id,
      status: existing.status,
      queueNumber: existing.queue_number,
      position: existing.status === "called" ? 0 : (peopleAhead ?? 0) + 1,
      peopleAhead: existing.status === "called" ? 0 : peopleAhead ?? 0,
      waitingCount: null,
      message: existing.status === "called" ? "Es tu turno." : "Ya estabas en la cola.",
    });
  }

  const { data: numberData, error: numberError } = await supabaseAdmin.rpc("next_queue_number", {
    target_store_id: store.id,
  });

  if (numberError) {
    return NextResponse.json({ error: "No se pudo generar el número de turno." }, { status: 500 });
  }

  const { data: entry, error: insertError } = await supabaseAdmin
    .from("queue_entries")
    .insert({
      store_id: store.id,
      visitor_token: visitorToken,
      queue_number: numberData,
      status: "waiting",
    })
    .select("id,status,queue_number,joined_at")
    .single();

  if (insertError || !entry) {
    return NextResponse.json({ error: "No se pudo crear tu turno." }, { status: 500 });
  }

  const { count: peopleAhead } = await supabaseAdmin
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "waiting")
    .lt("joined_at", entry.joined_at);

  const { count: waitingCount } = await supabaseAdmin
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "waiting");

  return NextResponse.json({
    storeName: store.name,
    entryId: entry.id,
    status: entry.status,
    queueNumber: entry.queue_number,
    position: (peopleAhead ?? 0) + 1,
    peopleAhead: peopleAhead ?? 0,
    waitingCount: waitingCount ?? 0,
    message: "Has entrado en la cola.",
  });
}
