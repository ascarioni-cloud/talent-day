import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeSlug = searchParams.get("storeSlug");
  const visitorToken = searchParams.get("visitorToken");

  if (!storeSlug) {
    return NextResponse.json({ error: "Falta storeSlug." }, { status: 400 });
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

  const { count: waitingCount, error: waitingError } = await supabaseAdmin
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "waiting");

  if (waitingError) {
    return NextResponse.json({ error: "No se pudo leer la cola." }, { status: 500 });
  }

  const { data: nextWaiting } = await supabaseAdmin
    .from("queue_entries")
    .select("queue_number")
    .eq("store_id", store.id)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!visitorToken) {
    return NextResponse.json({
      storeName: store.name,
      entryId: null,
      status: "not_joined",
      queueNumber: null,
      position: null,
      peopleAhead: null,
      waitingCount: waitingCount ?? 0,
      nextQueueNumber: nextWaiting?.queue_number ?? null,
      message: "Vista general de cola.",
    });
  }

  const { data: entry } = await supabaseAdmin
    .from("queue_entries")
    .select("id,status,queue_number,joined_at")
    .eq("store_id", store.id)
    .eq("visitor_token", visitorToken)
    .in("status", ["waiting", "called"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({
      storeName: store.name,
      entryId: null,
      status: "not_joined",
      queueNumber: null,
      position: null,
      peopleAhead: null,
      waitingCount: waitingCount ?? 0,
      message: "Todavía no estás en esta cola.",
    });
  }

  if (entry.status === "called") {
    return NextResponse.json({
      storeName: store.name,
      entryId: entry.id,
      status: "called",
      queueNumber: entry.queue_number,
      position: 0,
      peopleAhead: 0,
      waitingCount: waitingCount ?? 0,
      message: "Es tu turno.",
    });
  }

  const { count: peopleAhead, error: aheadError } = await supabaseAdmin
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "waiting")
    .lt("joined_at", entry.joined_at);

  if (aheadError) {
    return NextResponse.json({ error: "No se pudo calcular tu posición." }, { status: 500 });
  }

  const ahead = peopleAhead ?? 0;

  return NextResponse.json({
    storeName: store.name,
    entryId: entry.id,
    status: entry.status,
    queueNumber: entry.queue_number,
    position: ahead + 1,
    peopleAhead: ahead,
    waitingCount: waitingCount ?? 0,
    message: "Estás en la cola.",
  });
}
