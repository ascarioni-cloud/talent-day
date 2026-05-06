-- Virtual Queue · Supabase schema
-- Ejecutar en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  visitor_token text not null,
  queue_number integer not null,
  status text not null default 'waiting' check (status in ('waiting', 'called', 'served', 'cancelled')),
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists idx_queue_entries_store_status_joined
  on public.queue_entries (store_id, status, joined_at);

create unique index if not exists uq_queue_entries_store_queue_number
  on public.queue_entries (store_id, queue_number);

-- Evita que el mismo dispositivo tenga dos turnos activos en la misma tienda.
create unique index if not exists uq_queue_entries_active_visitor
  on public.queue_entries (store_id, visitor_token)
  where status in ('waiting', 'called');

create or replace function public.next_queue_number(target_store_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  next_number integer;
begin
  select coalesce(max(queue_number), 0) + 1
  into next_number
  from public.queue_entries
  where store_id = target_store_id;

  return next_number;
end;
$$;

-- Datos de ejemplo. Cambia los nombres/slugs según tus tiendas reales.
insert into public.stores (slug, name)
values
  ('nike', 'Nike'),
  ('adidas', 'Adidas'),
  ('puma', 'Puma')
on conflict (slug) do update
set name = excluded.name,
    is_active = true;

-- Seguridad:
-- Esta versión usa API Routes con SUPABASE_SERVICE_ROLE_KEY en servidor.
-- No des permisos públicos directos a las tablas salvo que decidas migrar a Supabase Realtime con RLS.
alter table public.stores enable row level security;
alter table public.queue_entries enable row level security;
