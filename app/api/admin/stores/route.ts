import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isValidAdminPin(pin: string | null | undefined) {
  return Boolean(process.env.ADMIN_PIN) && pin === process.env.ADMIN_PIN;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin");

  if (!isValidAdminPin(pin)) {
    return NextResponse.json({ error: "PIN de administrador incorrecto." }, { status: 401 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from("stores")
    .select("id,slug,name,is_active,created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar las tiendas." }, { status: 500 });
  }

  return NextResponse.json({ stores });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const pin = body?.pin;
  const name = String(body?.name || "").trim();
  const rawSlug = String(body?.slug || name).trim();
  const slug = slugify(rawSlug);

  if (!isValidAdminPin(pin)) {
    return NextResponse.json({ error: "PIN de administrador incorrecto." }, { status: 401 });
  }

  if (!name) {
    return NextResponse.json({ error: "El nombre de la tienda es obligatorio." }, { status: 400 });
  }

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "El slug debe tener al menos 2 caracteres válidos." }, { status: 400 });
  }

  if (slug.length > 60) {
    return NextResponse.json({ error: "El slug no puede superar 60 caracteres." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("stores")
    .select("id,slug,name,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Ya existe una tienda con el slug "${slug}". Usa otro slug.` },
      { status: 409 }
    );
  }

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .insert({
      name,
      slug,
      is_active: true,
    })
    .select("id,slug,name,is_active,created_at")
    .single();

  if (error || !store) {
    return NextResponse.json({ error: "No se pudo crear la tienda." }, { status: 500 });
  }

  return NextResponse.json({ store }, { status: 201 });
}
