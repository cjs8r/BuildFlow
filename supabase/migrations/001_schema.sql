-- ============================================================
-- BuildFlow schema — run this in Supabase SQL Editor
-- ============================================================

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  name         text    not null default '',
  email        text    not null default '',
  company_name text    not null default '',
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PROJECTS
create table if not exists public.projects (
  id              uuid not null default gen_random_uuid() primary key,
  contractor_id   uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  client_name     text not null,
  start_date      date not null,
  end_date        date not null,
  planned_budget  numeric not null default 0,
  actual_progress integer not null default 0,  -- 0–100, contractor-reported
  amount_spent    numeric not null default 0,
  status          text not null default 'active',
  created_at      timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "projects_all" on public.projects
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

-- CONTACTS
create table if not exists public.contacts (
  id            uuid not null default gen_random_uuid() primary key,
  project_id    uuid not null references public.projects(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  email         text not null default '',
  phone         text not null default '',
  role          text not null,           -- Homeowner | Co-owner | Architect | Subcontractor | Other
  custom_role   text not null default '', -- used when role = 'Other'
  created_at    timestamptz not null default now()
);
alter table public.contacts enable row level security;
create policy "contacts_all" on public.contacts
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

-- PROJECT FILES (metadata; binary lives in storage)
create table if not exists public.project_files (
  id            uuid not null default gen_random_uuid() primary key,
  project_id    uuid not null references public.projects(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  category      text not null,  -- photos | permits | invoices
  storage_path  text not null,
  file_type     text not null default '',
  size          bigint not null default 0,
  created_at    timestamptz not null default now()
);
alter table public.project_files enable row level security;
create policy "project_files_all" on public.project_files
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

-- WEEKLY REPORTS
create table if not exists public.weekly_reports (
  id               uuid not null default gen_random_uuid() primary key,
  project_id       uuid not null references public.projects(id) on delete cascade,
  contractor_id    uuid not null references public.profiles(id) on delete cascade,
  week_summary     text not null default '',
  whats_next       text not null default '',
  delays           text not null default '',
  progress_percent integer not null default 0,
  amount_spent     numeric not null default 0,
  include_budget   boolean not null default false,
  generated_report text not null default '',
  sent_at          timestamptz,
  sent_to          jsonb not null default '[]',  -- [{id, name}]
  created_at       timestamptz not null default now()
);
alter table public.weekly_reports enable row level security;
create policy "weekly_reports_all" on public.weekly_reports
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

-- SOP ITEMS
create table if not exists public.sop_items (
  id            uuid not null default gen_random_uuid() primary key,
  project_id    uuid not null references public.projects(id) on delete cascade,
  contractor_id uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  completed     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
alter table public.sop_items enable row level security;
create policy "sop_items_all" on public.sop_items
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

-- STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Storage RLS: path must start with contractor's user id
create policy "storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "storage_select" on storage.objects for select
  using (
    bucket_id = 'project-files'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "storage_delete" on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
