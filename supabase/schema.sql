-- CHENJ-Lab content management schema
-- Run this file once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.member_overrides (
    id uuid primary key default gen_random_uuid(),
    base_member_key text unique,
    name text,
    position text,
    research text,
    bio text,
    image_url text,
    category text check (category in ('Current Members', 'Former Members')),
    sort_order integer,
    is_visible boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint added_member_requires_name
        check (base_member_key is not null or name is not null)
);

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    summary text,
    body text,
    image_url text,
    published_at timestamptz not null default now(),
    status text not null default 'draft' check (status in ('draft', 'published')),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists member_overrides_set_updated_at on public.member_overrides;
create trigger member_overrides_set_updated_at
before update on public.member_overrides
for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.site_admins enable row level security;
alter table public.member_overrides enable row level security;
alter table public.announcements enable row level security;

grant select on public.site_admins to authenticated;
grant select on public.member_overrides to anon, authenticated;
grant insert, update, delete on public.member_overrides to authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

drop policy if exists "Admins can read their own role" on public.site_admins;
create policy "Admins can read their own role"
on public.site_admins for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read member display rules" on public.member_overrides;
create policy "Everyone can read member display rules"
on public.member_overrides for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert member display rules" on public.member_overrides;
create policy "Admins can insert member display rules"
on public.member_overrides for insert
to authenticated
with check (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Admins can update member display rules" on public.member_overrides;
create policy "Admins can update member display rules"
on public.member_overrides for update
to authenticated
using (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
))
with check (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Admins can delete added members" on public.member_overrides;
create policy "Admins can delete added members"
on public.member_overrides for delete
to authenticated
using (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Everyone can read published announcements" on public.announcements;
create policy "Everyone can read published announcements"
on public.announcements for select
to anon, authenticated
using (status = 'published' and published_at <= now());

drop policy if exists "Admins can read all announcements" on public.announcements;
create policy "Admins can read all announcements"
on public.announcements for select
to authenticated
using (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Admins can insert announcements" on public.announcements;
create policy "Admins can insert announcements"
on public.announcements for insert
to authenticated
with check (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
on public.announcements for update
to authenticated
using (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
))
with check (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

drop policy if exists "Admins can delete announcements" on public.announcements;
create policy "Admins can delete announcements"
on public.announcements for delete
to authenticated
using (exists (
    select 1 from public.site_admins admin where admin.user_id = auth.uid()
));

insert into storage.buckets (id, name, public)
values ('chenj-lab-media', 'chenj-lab-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read CHENJ-Lab media" on storage.objects;
create policy "Public can read CHENJ-Lab media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'chenj-lab-media');

drop policy if exists "Admins can upload CHENJ-Lab media" on storage.objects;
create policy "Admins can upload CHENJ-Lab media"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'chenj-lab-media'
    and exists (
        select 1 from public.site_admins admin where admin.user_id = auth.uid()
    )
);

drop policy if exists "Admins can update CHENJ-Lab media" on storage.objects;
create policy "Admins can update CHENJ-Lab media"
on storage.objects for update
to authenticated
using (
    bucket_id = 'chenj-lab-media'
    and exists (
        select 1 from public.site_admins admin where admin.user_id = auth.uid()
    )
)
with check (
    bucket_id = 'chenj-lab-media'
    and exists (
        select 1 from public.site_admins admin where admin.user_id = auth.uid()
    )
);

drop policy if exists "Admins can delete CHENJ-Lab media" on storage.objects;
create policy "Admins can delete CHENJ-Lab media"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'chenj-lab-media'
    and exists (
        select 1 from public.site_admins admin where admin.user_id = auth.uid()
    )
);

-- After creating an Auth user in Supabase, replace the email below and run:
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'admin@example.com'
-- on conflict (user_id) do nothing;
