-- ============================================================================
--  공감 리그 · 데이터베이스 스키마 (v1)
--  근거: docs/공감리그_설계문서.md (v4 최종 통합본) §14 DB 스키마
--  실행: Supabase 대시보드 SQL Editor 에 붙여넣고 Run
--
--  ⚠️ 이 스키마는 구 밸런스게임 마이그레이션(0001~0004)과 무관한 새 스키마다.
--     기존 DB에 구 테이블이 있으면 이름 충돌은 없지만, 깨끗하게 시작하려면
--     아래 [선택] RESET 블록의 주석을 풀어 먼저 실행하라.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- [선택] RESET — 이 스키마를 다시 깔 때만 주석 해제 (되돌릴 수 없음)
-- ---------------------------------------------------------------------------
-- drop table if exists hall_of_fame, titles, unlocks, replies, reasons,
--   reports, elo_history, matches, situations, arenas cascade;

-- ---------------------------------------------------------------------------
-- 확장 (pg_trgm = 중복 병합 검색. Postgres 기본, 무료 — §7)
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ============================================================================
--  1. arenas — 리그(축). 축은 '주제'가 아니라 '형용사' (§2)
-- ============================================================================
create table arenas (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                 -- 딥링크 URL 단위 (§3-5) /league/<slug>
  name            text not null,                        -- "제일 짜증나는 순간"
  emoji           text,                                 -- 😤
  is_open         boolean not null default false,       -- 오픈 여부 (상황 300개 미달이면 열지 마라 §10)
  supporter_count integer not null default 0,           -- 개설 지지 수 (리그 신설: 지지 50명 §12)
  created_at      timestamptz not null default now()
);

-- ============================================================================
--  2. situations — 상황. 항목의 단위. '문장'이 아니라 '겪은 일' (§2, §14)
-- ============================================================================
create table situations (
  id                uuid primary key default gen_random_uuid(),
  arena_id          uuid not null references arenas (id) on delete cascade,

  display_text      text not null,                      -- 통일 문체 (화면에 뜨는 것). 입력 제약 20~40자 §6-2
  first_reporter_id uuid references auth.users (id) on delete set null,  -- 최초 제보자(로그인)
  first_reporter_session text,                          -- 최초 제보자(익명 세션) — 둘 중 하나
  report_count      integer not null default 1,         -- 병합된 제보자 수 = 공감 1차 지표 §7

  -- 랭킹 (§5)
  elo               double precision not null default 1500,  -- 초기 Elo 1500 고정 §5-1
  matches           integer not null default 0,             -- 유효 대결 수(스킵 제외)
  wins              integer not null default 0,
  skip_count        integer not null default 0,             -- "안 겪어봤어요" 수 → 스킵률(보편성 지표) §4-4

  status            text not null default 'qualifying'      -- 🥚예선 / ✅본선 / 💀탈락 / 🏛️헌액 §5-8
                    check (status in ('qualifying','active','eliminated','enshrined')),
  top3_streak_days  integer not null default 0,             -- 헌액 판정: 7일 연속 TOP3 §5-6
  origin            text not null default 'report'          -- 출처
                    check (origin in ('seed','report','promoted')),

  created_at        timestamptz not null default now(),

  -- 최초 제보자는 로그인이든 익명이든 최소 하나는 있어야 한다
  constraint situations_reporter_present
    check (first_reporter_id is not null or first_reporter_session is not null),
  -- 입력 제약(§6-2)의 길이 하한/상한. "때" 종결은 축마다 달라 앱(입력 틀)에서 강제
  constraint situations_len check (char_length(btrim(display_text)) between 20 and 40)
);

-- ============================================================================
--  3. matches — 1대1 대결(= 추천). 편향 보정 컬럼이 핵심 (§4, §14)
-- ============================================================================
create table matches (
  id              uuid primary key default gen_random_uuid(),
  arena_id        uuid not null references arenas (id) on delete cascade,
  sit_a           uuid not null references situations (id) on delete cascade,
  sit_b           uuid not null references situations (id) on delete cascade,
  winner_id       uuid references situations (id) on delete cascade,  -- 스킵이면 null

  is_skip         boolean not null default false,   -- "안 겪어봤어요" → Elo 계산 제외 §4-3
  is_incumbent_a  boolean not null default false,   -- sit_a 가 승자잔류(잔류자)였나 → β 보정 §4-2
  position_swapped boolean not null default false,  -- 좌우 랜덤 스왑 여부 → 위치 편향 §4-2

  voter_id        uuid references auth.users (id) on delete set null,  -- 로그인 투표자
  voter_session   text not null,                    -- 익명 세션 id (항상 존재)
  weight          double precision not null default 1.0,  -- 익명 0.2 / 로그인 1.0 §13
  ms_elapsed      integer,                          -- 판정 소요(ms). 300ms 미만 무효 §13 · 노동 측정 §16
  created_at      timestamptz not null default now(),

  constraint matches_distinct check (sit_a <> sit_b),
  constraint matches_winner_valid
    check (winner_id is null or winner_id = sit_a or winner_id = sit_b),
  -- 스킵이면 승자 없음, 아니면 승자 있음
  constraint matches_skip_winner check (is_skip = (winner_id is null))
);

-- ============================================================================
--  4. elo_history — 🔥오늘 탭(24h ΔElo 정렬)의 재료 (§3-3, §14)
--     ★ §14 인덱스가 arena_id 를 요구 → 테이블에 추가(문서 정합화)
-- ============================================================================
create table elo_history (
  situation_id  uuid not null references situations (id) on delete cascade,
  arena_id      uuid not null references arenas (id) on delete cascade,
  date          date not null default current_date,
  elo           double precision not null,          -- 그 날 종가 Elo
  delta_24h     double precision not null default 0, -- 24시간 변동 (상승세 정렬)
  primary key (situation_id, date)
);

-- ============================================================================
--  5. reports — 원문 로그 + 병합 추적. raw_text 보존은 Phase2 학습 자산 (§6, §7)
-- ============================================================================
create table reports (
  id              uuid primary key default gen_random_uuid(),
  situation_id    uuid not null references situations (id) on delete cascade,
  raw_text        text not null,                    -- 유저가 대충 쓴 원문 — 절대 삭제 금지 §14
  reporter_id     uuid references auth.users (id) on delete set null,
  reporter_session text,
  is_merge        boolean not null default false,   -- 신규 등록인가 병합인가
  merged_by       text check (merged_by in ('user','embedding','report')),  -- 병합 주체 §7 (P1:user)
  created_at      timestamptz not null default now()
);

-- ============================================================================
--  6. reasons — 이유(투표 직후 한 줄). 정규화하지 않는다 (§8-1)
-- ============================================================================
create table reasons (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches (id) on delete cascade,
  voter_id    uuid references auth.users (id) on delete set null,
  voter_session text,
  text        text not null check (char_length(text) <= 60),  -- 전부 60자 §8-3
  upvotes     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================================
--  7. replies — 이어쓰기(= 댓글). 승격되면 독립 상황이 된다 (§8-2)
-- ============================================================================
create table replies (
  id            uuid primary key default gen_random_uuid(),
  situation_id  uuid not null references situations (id) on delete cascade,
  author_id     uuid references auth.users (id) on delete set null,
  author_session text,
  text          text not null check (char_length(text) <= 60),  -- 깊이1 · 60자 §8-3
  upvotes       integer not null default 0,
  promoted      boolean not null default false,     -- 승격되어 상황으로 참전했나 §8-2
  created_at    timestamptz not null default now()
);

-- ============================================================================
--  8. unlocks — 10판 언락(제보/이어쓰기 개방) 추적. 익명 세션 단위 (§6-6)
-- ============================================================================
create table unlocks (
  session_id    text primary key,                   -- 익명 세션 id
  votes_count   integer not null default 0,         -- 누적 투표 수
  unlocked_at   timestamptz,                        -- 10판 달성 시각(null=미개방)
  updated_at    timestamptz not null default now()
);

-- ============================================================================
--  9. titles — 칭호. 4단계 이상 만들지 마라 (§9). 로그인 유저만
-- ============================================================================
create table titles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null                       -- 제보자/개척자/명예의전당/전설
                check (title in ('reporter','pioneer','hall_of_fame','legend')),
  situation_id  uuid references situations (id) on delete set null,  -- 상황 결부 칭호면 지정
  granted_at    timestamptz not null default now(),
  unique (user_id, title, situation_id)
);

-- ============================================================================
-- 10. hall_of_fame — 명예의 전당(헌액). 영구히 남는 이름 (§5-6, §9)
-- ============================================================================
create table hall_of_fame (
  id            uuid primary key default gen_random_uuid(),
  situation_id  uuid not null unique references situations (id) on delete cascade,
  hof_number    bigint generated by default as identity unique,  -- 전당 #7
  final_elo     double precision not null,
  inducted_at   timestamptz not null default now()
);

-- ============================================================================
--  인덱스 (§14)
-- ============================================================================
create index situations_rank_idx     on situations (arena_id, status, elo desc);
create index situations_trgm_idx     on situations using gin (display_text gin_trgm_ops);  -- 중복 검색 §7
create index elo_history_today_idx   on elo_history (arena_id, date, delta_24h desc);       -- 🔥오늘 탭
create index matches_arena_idx       on matches (arena_id, created_at desc);
create index matches_incumbent_idx   on matches (arena_id, is_incumbent_a) where not is_skip;  -- β 추정 §4-2
create index reports_situation_idx   on reports (situation_id);
create index reasons_match_idx       on reasons (match_id);
create index replies_situation_idx   on replies (situation_id);
create index titles_user_idx         on titles (user_id);

-- ============================================================================
--  RLS — 콘텐츠는 공개 읽기, 쓰기는 정책 없음(= service_role / SECURITY DEFINER RPC 로만)
--  ⚠️ 투표·제보 쓰기 경로(RPC)는 데이터 계층 구현 시 별도로 추가한다.
--     내부 테이블(matches / reports / unlocks)은 읽기도 공개하지 않는다(세션 노출 방지).
-- ============================================================================
alter table arenas       enable row level security;
alter table situations   enable row level security;
alter table matches      enable row level security;
alter table elo_history  enable row level security;
alter table reports      enable row level security;
alter table reasons      enable row level security;
alter table replies      enable row level security;
alter table unlocks      enable row level security;
alter table titles       enable row level security;
alter table hall_of_fame enable row level security;

-- 공개 읽기(anon + authenticated)
create policy "public read" on arenas       for select using (true);
create policy "public read" on situations   for select using (true);
create policy "public read" on elo_history  for select using (true);
create policy "public read" on reasons      for select using (true);
create policy "public read" on replies      for select using (true);
create policy "public read" on titles       for select using (true);
create policy "public read" on hall_of_fame for select using (true);
-- matches / reports / unlocks 는 공개 읽기 없음(내부용). 필요한 집계는 RPC/뷰로 노출.

-- ============================================================================
--  ☁️ Phase 2 (지금은 실행하지 마라) — AI 임베딩 병합 (§7, §14, 로드맵 §18-10)
--     중복 오검출률 20% 초과가 트리거. pgvector 활성화 후 아래를 실행.
-- ============================================================================
-- create extension if not exists vector;
-- alter table situations add column embedding vector(768);   -- P1: null
-- create index situations_embedding_idx on situations
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);
