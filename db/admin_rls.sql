-- 관리자 쓰기 권한 (Supabase Auth + Google 로그인). SQL Editor에서 Run (재실행 안전).
-- 방문자(anon)는 지금처럼 읽기+댓글+투표만. 아래 이메일로 로그인한 관리자만 밈 등록/편집.
--
-- 전제: Supabase Authentication → Providers → Google 활성화(그 OAuth Client ID/Secret 사용),
--       Google Cloud OAuth 클라이언트의 승인 리디렉션 URI에
--       https://faofjruxrabdbtesrkub.supabase.co/auth/v1/callback 추가.

-- 관리자 판별 (허용 이메일만 true). 관리자 추가는 이 목록만 고치면 됨.
create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'jamm2ic@gmail.com',
    'l89192164@gmail.com'
  )
$$;

-- memes: 관리자 전체 쓰기(insert/update/delete). 기존 "public read memes"(anon select)는 유지.
drop policy if exists "admin write memes" on memes;
create policy "admin write memes" on memes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- discovery_candidates: 관리자만 읽기 + 상태 갱신(등록/반려). 방문자엔 계속 비공개.
drop policy if exists "admin read candidates" on discovery_candidates;
create policy "admin read candidates" on discovery_candidates
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin update candidates" on discovery_candidates;
create policy "admin update candidates" on discovery_candidates
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
