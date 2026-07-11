-- 0004: 덱을 DB 정본으로 — 전체 Deck 객체를 data(jsonb)에 저장.
-- v3 구조(merit·유형·캐릭터 카드)는 rigid 컬럼으로 담기 어려워 통째 JSONB로 둔다.
-- 앱은 is_public 행의 data를 읽고(공개 RLS), 관리자만 service_role로 쓴다.

alter table public.decks add column if not exists data jsonb;
alter table public.decks add column if not exists sort integer not null default 0;
alter table public.decks add column if not exists updated_at timestamptz not null default now();

-- 기존 v2 rigid 컬럼은 더 이상 정본이 아님 → 새 행은 data만 채우면 되게 NOT NULL 해제.
alter table public.decks alter column title drop not null;
alter table public.decks alter column emoji drop not null;
alter table public.decks alter column side_a drop not null;
alter table public.decks alter column side_b drop not null;
alter table public.decks alter column penalties_a drop not null;
alter table public.decks alter column penalties_b drop not null;

-- 공개 읽기 정책(is_public)은 0001에 이미 있음. 쓰기는 service_role(RLS 우회)로만.
