-- ResumeRoute schema — run in Supabase SQL editor
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  skills text[] default '{}',
  resume_url text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null,
  company text not null,
  location text,
  salary text,
  match_score int not null default 0,
  job_url text not null,
  alerted boolean not null default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.job_matches to authenticated;
grant all on public.job_matches to service_role;
alter table public.job_matches enable row level security;
drop policy if exists "job_matches self read" on public.job_matches;
create policy "job_matches self read" on public.job_matches for select to authenticated using (auth.uid() = user_id);
drop policy if exists "job_matches self insert" on public.job_matches;
create policy "job_matches self insert" on public.job_matches for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "job_matches self update" on public.job_matches;
create policy "job_matches self update" on public.job_matches for update to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('resumes', 'resumes', true)
on conflict (id) do update set public = true;
drop policy if exists "resumes self upload" on storage.objects;
create policy "resumes self upload" on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "resumes self update" on storage.objects;
create policy "resumes self update" on storage.objects for update to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "resumes public read" on storage.objects;
create policy "resumes public read" on storage.objects for select to public using (bucket_id = 'resumes');

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bio text,
  location text,
  phone text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;
alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles self read" on public.user_profiles;
create policy "user_profiles self read" on public.user_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_profiles self insert" on public.user_profiles;
create policy "user_profiles self insert" on public.user_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "user_profiles self update" on public.user_profiles;
create policy "user_profiles self update" on public.user_profiles for update to authenticated using (auth.uid() = user_id);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null,
  proficiency_level text default 'intermediate',
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.user_skills to authenticated;
grant all on public.user_skills to service_role;
alter table public.user_skills enable row level security;
drop policy if exists "user_skills self read" on public.user_skills;
create policy "user_skills self read" on public.user_skills for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_skills self insert" on public.user_skills;
create policy "user_skills self insert" on public.user_skills for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "user_skills self update" on public.user_skills;
create policy "user_skills self update" on public.user_skills for update to authenticated using (auth.uid() = user_id);
drop policy if exists "user_skills self delete" on public.user_skills;
create policy "user_skills self delete" on public.user_skills for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text,
  job_title text not null,
  company text not null,
  location text,
  salary text,
  job_url text not null,
  saved_at timestamptz default now()
);
grant select, insert, update, delete on public.saved_jobs to authenticated;
grant all on public.saved_jobs to service_role;
alter table public.saved_jobs enable row level security;
drop policy if exists "saved_jobs self read" on public.saved_jobs;
create policy "saved_jobs self read" on public.saved_jobs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saved_jobs self insert" on public.saved_jobs;
create policy "saved_jobs self insert" on public.saved_jobs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "saved_jobs self delete" on public.saved_jobs;
create policy "saved_jobs self delete" on public.saved_jobs for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.user_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_url text not null,
  extracted_skills_json jsonb default '[]'::jsonb,
  uploaded_at timestamptz default now()
);
grant select, insert, update, delete on public.user_resumes to authenticated;
grant all on public.user_resumes to service_role;
alter table public.user_resumes enable row level security;
drop policy if exists "user_resumes self read" on public.user_resumes;
create policy "user_resumes self read" on public.user_resumes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_resumes self insert" on public.user_resumes;
create policy "user_resumes self insert" on public.user_resumes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "user_resumes self update" on public.user_resumes;
create policy "user_resumes self update" on public.user_resumes for update to authenticated using (auth.uid() = user_id);
