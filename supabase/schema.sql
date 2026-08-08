create table if not exists public.user_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_portfolios enable row level security;

drop policy if exists "Users can view their own portfolio" on public.user_portfolios;
create policy "Users can view their own portfolio"
on public.user_portfolios for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own portfolio" on public.user_portfolios;
create policy "Users can create their own portfolio"
on public.user_portfolios for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own portfolio" on public.user_portfolios;
create policy "Users can update their own portfolio"
on public.user_portfolios for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own portfolio" on public.user_portfolios;
create policy "Users can delete their own portfolio"
on public.user_portfolios for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_portfolios_updated_at on public.user_portfolios;
create trigger set_user_portfolios_updated_at
before update on public.user_portfolios
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can view their own document files" on storage.objects;
create policy "Users can view their own document files"
on storage.objects for select
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload their own document files" on storage.objects;
create policy "Users can upload their own document files"
on storage.objects for insert
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own document files" on storage.objects;
create policy "Users can update their own document files"
on storage.objects for update
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own document files" on storage.objects;
create policy "Users can delete their own document files"
on storage.objects for delete
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
