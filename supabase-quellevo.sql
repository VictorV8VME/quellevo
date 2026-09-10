-- QuéLlevo: run once in Supabase SQL Editor
create table if not exists quellevo_events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  kind text not null default 'asado',
  place text,
  event_at timestamptz,
  host_name text,
  created_at timestamptz not null default now()
);

create table if not exists quellevo_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quellevo_events(id) on delete cascade,
  label text not null,
  claimed_by text,
  created_at timestamptz not null default now()
);

create index if not exists quellevo_events_code_idx on quellevo_events(code);
create index if not exists quellevo_items_event_idx on quellevo_items(event_id);

alter table quellevo_events enable row level security;
alter table quellevo_items enable row level security;

-- Share-link MVP: anyone with the link can read/write (code is the secret)
drop policy if exists quellevo_events_all on quellevo_events;
create policy quellevo_events_all on quellevo_events for all using (true) with check (true);

drop policy if exists quellevo_items_all on quellevo_items;
create policy quellevo_items_all on quellevo_items for all using (true) with check (true);

grant select, insert, update, delete on quellevo_events to anon, authenticated;
grant select, insert, update, delete on quellevo_items to anon, authenticated;


-- Soft monetization: local sponsor offers (carnicerías / súper)
create table if not exists quellevo_sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'otro', -- carniceria | super | bebidas | otro
  promo_text text not null,
  whatsapp text,
  url text,
  city text default 'Paso de los Libres',
  active boolean not null default true,
  sort int not null default 100,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quellevo_sponsors_active_sort_idx
  on quellevo_sponsors (active, sort);

alter table quellevo_sponsors enable row level security;

-- Public read of active (non-expired) sponsors only
drop policy if exists quellevo_sponsors_read_active on quellevo_sponsors;
create policy quellevo_sponsors_read_active on quellevo_sponsors
  for select
  using (
    active = true
    and (expires_at is null or expires_at > now())
  );

grant select on quellevo_sponsors to anon, authenticated;
-- Writes: dashboard / service role only (no public insert/update/delete)


-- =============================================================================
-- MVP+ migrations (append / run after base tables exist)
-- Coordinator applies via Supabase MCP. Safe: IF NOT EXISTS / additive only.
-- =============================================================================

-- 1) Item categories (carne | bebida | ensalada | postre | carbon | otro)
alter table quellevo_items
  add column if not exists category text default 'otro';

-- 2) Events: place + event_at already exist above; optional guests jsonb fallback for RSVP
alter table quellevo_events
  add column if not exists guests jsonb default '[]'::jsonb;

-- 3) Sponsors: pending moderation (public insert → pending=true, active=false)
alter table quellevo_sponsors
  add column if not exists pending boolean not null default false;

-- Allow anon to insert ONLY pending inactive rows (moderation queue)
drop policy if exists quellevo_sponsors_insert_pending on quellevo_sponsors;
create policy quellevo_sponsors_insert_pending on quellevo_sponsors
  for insert
  to anon, authenticated
  with check (active = false and pending = true);

grant insert on quellevo_sponsors to anon, authenticated;

-- Keep public read limited to approved active (and non-expired)
drop policy if exists quellevo_sponsors_read_active on quellevo_sponsors;
create policy quellevo_sponsors_read_active on quellevo_sponsors
  for select
  using (
    active = true
    and (pending = false or pending is null)
    and (expires_at is null or expires_at > now())
  );

-- 4) Preferred RSVP table (per name on event)
create table if not exists quellevo_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references quellevo_events(id) on delete cascade,
  guest_name text not null,
  status text not null check (status in ('voy', 'talvez', 'no')),
  created_at timestamptz not null default now(),
  unique (event_id, guest_name)
);

create index if not exists quellevo_rsvps_event_idx on quellevo_rsvps(event_id);

alter table quellevo_rsvps enable row level security;

drop policy if exists quellevo_rsvps_all on quellevo_rsvps;
create policy quellevo_rsvps_all on quellevo_rsvps
  for all using (true) with check (true);

grant select, insert, update, delete on quellevo_rsvps to anon, authenticated;

-- 5) Event closed / finalized flag (hide add/claim when true)
alter table quellevo_events
  add column if not exists closed boolean not null default false;

create index if not exists quellevo_events_closed_idx on quellevo_events(closed);
