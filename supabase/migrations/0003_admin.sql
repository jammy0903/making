-- 관리자 페이지 지원: 고유 방문자 집계 · 주제/조건 신청.
-- 익명 앱 원칙 유지: 접속 메타데이터(IP·UA) 미수집, 세션 uuid만. 관리자 읽기는
-- 서버 전용 service_role로만(아래 테이블엔 anon SELECT 정책 없음 → 익명은 못 읽음).

-- ── 고유 방문자 (세션당 1행) ──────────────────────────────────
create table if not exists public.visits (
  session_id text primary key,               -- 브라우저 localStorage uuid(익명)
  is_admin   boolean not null default false,  -- 관리자 세션 → 집계에서 제외
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

-- ── 주제/조건 신청 ────────────────────────────────────────────
create table if not exists public.deck_requests (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('topic', 'condition')),
  session_id text,                            -- 신청자 익명 세션(선택)
  title      text not null,                   -- 주제명 또는 대상(어느 덱/편)
  body       text not null,                   -- 상세 내용/조건 문구
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists deck_requests_status_idx on public.deck_requests (status, created_at desc);

-- ── RLS: 둘 다 익명 직접 접근 차단. 쓰기는 아래 SECURITY DEFINER RPC로만. ──
alter table public.visits enable row level security;
alter table public.deck_requests enable row level security;
-- 정책 없음 = anon SELECT/INSERT/UPDATE 모두 거부. 관리자는 서버의 service_role로 우회.

-- ── RPC: 방문 기록(upsert, 세션 유니크) ───────────────────────
create or replace function public.log_visit(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null or length(p_session_id) = 0 then
    return;
  end if;
  insert into public.visits (session_id)
  values (p_session_id)
  on conflict (session_id) do update set last_seen = now();
end;
$$;
grant execute on function public.log_visit(text) to anon, authenticated;

-- ── RPC: 주제/조건 신청 접수 ──────────────────────────────────
create or replace function public.submit_request(
  p_kind       text,
  p_title      text,
  p_body       text,
  p_session_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_kind not in ('topic', 'condition') then
    raise exception 'invalid kind: %', p_kind;
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'title required';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'body required';
  end if;
  -- 남용 방지: 과도한 길이 컷.
  insert into public.deck_requests (kind, session_id, title, body)
  values (p_kind, p_session_id, left(trim(p_title), 100), left(trim(p_body), 500))
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.submit_request(text, text, text, text) to anon, authenticated;
