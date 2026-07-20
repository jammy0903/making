-- 연도 맞히기 — 상세 페이지의 방문자 판정("이거 몇 년도 밈일까?").
-- SQL Editor에서 Run (재실행 안전).
--
-- 배경: 사망 개념을 걷어낸 뒤(db/remove_death.sql) 남은 투표가 "밈이다/밈이 아니다"뿐이라
-- 방문자가 판정할 맛이 없었다(실측: 전체 53표·브라우저 5개, '밈 아님' 큐 0건 = 사실상 미사용).
-- 판정의 축이 전성기 연도(era_year, 1218개 100% 채워짐)로 옮겨갔으므로 판정도 그리로 옮긴다.
--
-- 부수 효과: 큐레이션한 era_year가 실제로 맞는지 군중 추측으로 검증할 수 있다
-- (era_guess_stats의 평균 추측이 era_year에서 크게 벗어나면 그 값을 의심해볼 것).

-- ── 1) 추측 기록 ──
create table if not exists era_guesses (
  meme_id    bigint  not null references memes(id) on delete cascade,
  voter_id   text    not null,               -- meme_votes와 동일한 브라우저 식별자
  guess_year int     not null check (guess_year between 1980 and 2100),
  created_at timestamptz not null default now(),
  primary key (meme_id, voter_id)            -- 브라우저당 밈 1회 — 중복은 409(클라가 무시)
  -- 주의: ON CONFLICT upsert 금지. 충돌 행 읽기에 select 정책이 필요한데
  -- 이 테이블은 개별 행을 공개하지 않는다(집계 뷰로만 노출). meme_awareness와 같은 이유.
);

create index if not exists era_guesses_meme_idx on era_guesses (meme_id);

alter table era_guesses enable row level security;

-- 쓰기만 공개. 개별 추측은 못 읽는다(누가 뭘 찍었는지 노출 방지) — 읽기는 아래 집계 뷰로만.
drop policy if exists "anyone insert era_guess" on era_guesses;
create policy "anyone insert era_guess" on era_guesses
  for insert with check (true);

-- ── 2) 집계 뷰 — 개별 행이 아니라 밈별 통계만 공개 ──
--   표본 3개 미만은 내보내지 않는다: 1~2명 추측은 통계라기보다 그 사람 답이 그대로 드러나는 것에 가깝다.
create or replace view era_guess_stats as
select
  g.meme_id,
  count(*)                                   as guesses,
  round(avg(g.guess_year))::int              as avg_guess,
  percentile_cont(0.5) within group (order by g.guess_year)::int as median_guess,
  m.era_year,
  round(avg(abs(g.guess_year - m.era_year)), 1) as avg_abs_error  -- 군중이 평균 몇 년 빗나가나
from era_guesses g
join memes m on m.id = g.meme_id
group by g.meme_id, m.era_year
having count(*) >= 3;

grant select on era_guess_stats to anon, authenticated;
