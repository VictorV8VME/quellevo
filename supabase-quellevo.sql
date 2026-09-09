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
