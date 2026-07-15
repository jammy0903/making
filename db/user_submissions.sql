-- 회원(로그인) 밈 신청 + 감사 로그. SQL Editor에서 Run(재실행 안전).
-- 원칙: 회원도 '제안'(신청)만 하고, 등록 결정은 관리자(기계 발굴과 동일한 사람-결정 패턴).
--       모든 상태 변화(신청·철회·등록·반려)는 로그로 남긴다 — 클라가 빼먹어도 트리거가 기록.
-- 전제: public.is_admin() (db/admin_rls.sql) 이 먼저 존재해야 함.

-- ── 1) 신청 테이블 ──
create table if not exists public.meme_submissions (
  id           bigint generated always as identity primary key,
  user_id      text not null,                     -- auth.uid()::text
  email        text,
  nick         text,
  name         text not null,                     -- 밈 이름
  description  text,                              -- 뜻/설명
  example      text,                              -- 사용 예·맥락
  source_url   text,                              -- 출처(선택)
  tags         text[] not null default '{}',
  status       text  not null default 'pending',  -- pending | withdrawn | accepted | rejected
  created_at   timestamptz not null default now(),
  withdrawn_at timestamptz,
  reviewed_at  timestamptz
);
create index if not exists meme_submissions_user_idx   on public.meme_submissions (user_id, created_at desc);
create index if not exists meme_submissions_status_idx on public.meme_submissions (status, created_at desc);

-- ── 2) 감사 로그 (append-only). FK 없이 느슨히 참조 — 로그는 어떤 경우에도 막히지 않는다 ──
create table if not exists public.submission_events (
  id            bigint generated always as identity primary key,
  submission_id bigint,
  user_id       text,           -- 행위자(auth.uid) 또는 신청자
  action        text not null,  -- submit | withdraw | accept | reject | update
  status        text,           -- 전이 후 상태
  at            timestamptz not null default now()
);
create index if not exists submission_events_sub_idx on public.submission_events (submission_id, at);

-- ── 3) 트리거: 삽입/상태변경을 자동 로깅 + 타임스탬프 설정 ──
-- BEFORE라 NEW를 수정할 수 있고, FK가 없어 삽입 시점 문제도 없다. security definer로 RLS 우회 기록.
create or replace function public.log_submission_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.submission_events(submission_id, user_id, action, status)
    values (new.id, new.user_id, 'submit', new.status);
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if new.status = 'withdrawn' then new.withdrawn_at := now(); end if;
    if new.status in ('accepted', 'rejected') then new.reviewed_at := now(); end if;
    insert into public.submission_events(submission_id, user_id, action, status)
    values (new.id, coalesce(auth.uid()::text, new.user_id),
            case new.status
              when 'withdrawn' then 'withdraw'
              when 'accepted'  then 'accept'
              when 'rejected'  then 'reject'
              else 'update' end,
            new.status);
  end if;
  return new;
end $$;
drop trigger if exists trg_log_submission on public.meme_submissions;
create trigger trg_log_submission
  before insert or update on public.meme_submissions
  for each row execute function public.log_submission_event();

-- ── 4) RLS ──
alter table public.meme_submissions enable row level security;
alter table public.submission_events enable row level security;

-- 신청: 본인 것만 삽입
drop policy if exists "insert own submission" on public.meme_submissions;
create policy "insert own submission" on public.meme_submissions
  for insert to authenticated
  with check (user_id = auth.uid()::text);

-- 조회: 본인 것 + 관리자 전체
drop policy if exists "read own or admin submissions" on public.meme_submissions;
create policy "read own or admin submissions" on public.meme_submissions
  for select to authenticated
  using (user_id = auth.uid()::text or public.is_admin());

-- 갱신: 본인은 pending/withdrawn 사이에서만(자기 신청 철회), 관리자는 전체(등록/반려)
drop policy if exists "update own or admin submission" on public.meme_submissions;
create policy "update own or admin submission" on public.meme_submissions
  for update to authenticated
  using (user_id = auth.uid()::text or public.is_admin())
  with check (
    public.is_admin()
    or (user_id = auth.uid()::text and status in ('pending', 'withdrawn'))
  );
-- (삭제 정책 없음 → 하드삭제 불가. 철회는 상태 전이로 로그에 남는다.)

-- 로그: 관리자 전체 / 본인 것 읽기. 삽입 정책 없음(트리거만 기록).
drop policy if exists "read submission events" on public.submission_events;
create policy "read submission events" on public.submission_events
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid()::text);
