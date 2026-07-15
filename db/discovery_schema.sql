-- 발굴(discovery) Phase 0 스키마 — SQL Editor에서 Run (재실행 안전).
-- 설계: docs/discovery-design.md · 계획: docs/discovery-plan.md
--
-- 버스트 감지(Phase 1)의 배경률(λ) 계산용 시계열을 쌓는다. 감지 로직은 없음.
-- 크롤 원문은 지금까지 어디에도 저장되지 않았으므로(매칭 후 버려짐) 여기서부터 누적 시작.

-- ── 1) raw_texts: 크롤 원문 (post_id로 전역 dedup — 재크롤된 옛 댓글이 통계를 오염시키지 않게) ──
create table if not exists raw_texts (
  id         bigint generated always as identity primary key,
  post_id    text not null unique,   -- pipeline의 dedup 키(p.id)와 동일
  text       text not null,
  source     text not null,          -- youtube / dcinside ...
  topic      text,                   -- 유튜브 주제 키 (idol, game ...)
  url        text,                   -- 문서 식별(유튜브=영상 URL). doc_count의 기준
  day        date not null,
  created_at timestamptz not null default now()
);
create index if not exists raw_texts_day_idx on raw_texts (day);
alter table raw_texts enable row level security;  -- 정책 없음 → service role 전용

-- ── 2) ngram_daily: n-gram 일별·소스별 카운트 (버스트 감지의 원료) ──
create table if not exists ngram_daily (
  ngram     text not null,           -- 한글 2~6자
  day       date not null,
  source    text not null,
  count     integer not null default 0,  -- 총 등장 수
  doc_count integer not null default 0,  -- 서로 다른 문서(영상/글) 수 — "영상≥2" 조건용
  primary key (ngram, day, source)
);
create index if not exists ngram_daily_day_idx on ngram_daily (day);
alter table ngram_daily enable row level security;

-- ── 3) rejected_terms: 사람이 반려한 후보 (제외목록 + negative few-shot 환류) ──
create table if not exists rejected_terms (
  term        text primary key,
  rejected_at timestamptz not null default now(),
  note        text
);
alter table rejected_terms enable row level security;

-- ── 4) 카운트 가산 upsert RPC ──
-- PostgREST의 merge-duplicates upsert는 "덮어쓰기"라, 같은 날 2회 크롤 시 앞 크롤 카운트가
-- 소실된다. 충돌 시 count를 "더하는" 함수로 해결.
create or replace function bump_ngram_daily(rows jsonb)
returns void
language sql
as $$
  insert into ngram_daily (ngram, day, source, count, doc_count)
  select r.ngram, r.day, r.source, r.count, r.doc_count
  from jsonb_to_recordset(rows) as r(ngram text, day date, source text, count int, doc_count int)
  on conflict (ngram, day, source) do update
    set count     = ngram_daily.count     + excluded.count,
        doc_count = ngram_daily.doc_count + excluded.doc_count;
$$;

-- RPC는 기본으로 anon에도 노출되므로 서버(service role) 전용으로 잠근다.
revoke execute on function bump_ngram_daily(jsonb) from anon, authenticated;
