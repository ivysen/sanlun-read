-- 用户扩展资料：预留每日阅读次数，便于后续付费限制
-- 在 Supabase SQL Editor 中执行，或作为迁移运行

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  -- 当日剩余「生成解读」次数（免费档默认 3，可按日重置）
  daily_read_remaining integer not null default 3,
  last_usage_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 新用户注册时自动插入 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
