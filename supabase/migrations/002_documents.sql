-- 用户上传的 PDF 提取文本（执行前请确保已启用 pgcrypto 或 uuid 扩展；Supabase 默认有 gen_random_uuid）

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

create policy "Users insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users select own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);
