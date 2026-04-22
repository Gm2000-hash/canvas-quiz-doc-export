-- Theme customizations: per-user, per-scope (page or element) overrides
create table public.theme_customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope_type text not null check (scope_type in ('page','element','global')),
  scope_key text not null,
  wallpaper_path text,
  wallpaper_filters jsonb not null default '{}'::jsonb,
  color text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope_type, scope_key)
);

alter table public.theme_customizations enable row level security;

create policy "Users can view own theme customizations"
  on public.theme_customizations for select
  to authenticated using (user_id = auth.uid());

create policy "Users can insert own theme customizations"
  on public.theme_customizations for insert
  to authenticated with check (user_id = auth.uid());

create policy "Users can update own theme customizations"
  on public.theme_customizations for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own theme customizations"
  on public.theme_customizations for delete
  to authenticated using (user_id = auth.uid());

create trigger set_theme_customizations_updated_at
  before update on public.theme_customizations
  for each row execute function public.set_updated_at();

create index theme_customizations_user_scope_idx
  on public.theme_customizations (user_id, scope_type, scope_key);

-- Private wallpapers bucket
insert into storage.buckets (id, name, public)
values ('wallpapers', 'wallpapers', false)
on conflict (id) do nothing;

create policy "Users can read own wallpapers"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own wallpapers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own wallpapers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own wallpapers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'wallpapers' and (storage.foldername(name))[1] = auth.uid()::text);