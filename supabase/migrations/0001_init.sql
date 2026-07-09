-- "그런데 이제" 밸런스 게임 · 초기 스키마
-- 근거: docs/game-design.md §E (데이터 모델). 로그인 없음 · 익명 전제.

-- ── 덱 (콘텐츠) ───────────────────────────────────────────────
-- DB가 소스 오브 트루스. 공식 덱은 seed.sql(git)로 버전관리(§E-1).
create table if not exists public.decks (
  id          text primary key,        -- 'summer-winter', 'marriage'
  title       text not null,           -- 그리드 표시용 제목
  emoji       text not null,
  side_a      jsonb not null,          -- {"name":"여름","emoji":"🌞"}
  side_b      jsonb not null,
  penalties_a jsonb not null,          -- ["에어컨 없어도", ...] 강도 오름차순 · 9장(2~10판)
  penalties_b jsonb not null,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 플레이 로그 (append-only) ─────────────────────────────────
-- 출시부터 익명 축적(§E-2). 3층 통계는 나중(§D-5).
create table if not exists public.plays (
  id          uuid primary key default gen_random_uuid(),
  deck_id     text not null references public.decks(id),
  session_id  text,                    -- 익명 세션(브라우저 생성 uuid)
  choices     smallint[] not null,     -- 0=side_a, 1=side_b · 판 순서대로 (결과 계산 원본)
  reaction_ms integer[],               -- 옵션: 판별 반응시간
  pref_side   smallint,                -- 파생 캐시: 0/1 (§A-5 선호편)
  depth_a     smallint,                -- 파생 캐시: side_a 완주 강도
  depth_b     smallint,                -- 파생 캐시: side_b 완주 강도
  created_at  timestamptz not null default now()
);
create index if not exists plays_deck_id_idx on public.plays (deck_id);

-- ── RLS ───────────────────────────────────────────────────────
-- 익명 앱: 덱은 공개 읽기, 플레이는 삽입만(남의 로그 못 읽음).
alter table public.decks enable row level security;
alter table public.plays enable row level security;

create policy "decks are publicly readable"
  on public.decks for select using (is_public);

create policy "anyone can log a play"
  on public.plays for insert with check (true);
