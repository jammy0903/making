-- 댓글 권한(본인/관리자 수정·삭제) + 회원 프로필(가입자 목록). SQL Editor에서 Run(재실행 안전).

-- ── 1) 댓글: 작성자 본인 또는 관리자만 수정/삭제 ──
drop policy if exists "author or admin update comments" on meme_comments;
create policy "author or admin update comments" on meme_comments
  for update to authenticated
  using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "author or admin delete comments" on meme_comments;
create policy "author or admin delete comments" on meme_comments
  for delete to authenticated
  using (user_id = auth.uid()::text or public.is_admin());

-- ── 2) 회원 프로필 (로그인/가입한 사용자 목록) ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- 신규 가입 시 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 로그인한 사용자 백필
insert into public.profiles (id, email, full_name)
  select id, email, raw_user_meta_data ->> 'full_name' from auth.users
  on conflict (id) do nothing;

-- RLS: 관리자 전체 읽기 / 본인 읽기·삭제(탈퇴)
alter table public.profiles enable row level security;
drop policy if exists "admin read profiles" on profiles;
create policy "admin read profiles" on profiles for select to authenticated using (public.is_admin());
drop policy if exists "self read profile" on profiles;
create policy "self read profile" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "self delete profile" on profiles;
create policy "self delete profile" on profiles for delete to authenticated using (id = auth.uid());
