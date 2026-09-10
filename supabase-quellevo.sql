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
