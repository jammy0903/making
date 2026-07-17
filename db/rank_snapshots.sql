-- 일별 순위 스냅샷 — 순위 이력의 정본.
-- SQL Editor에서 Run (재실행 안전).
--
-- 왜? meme_ranking은 뷰라서 "지난주 순위"가 어디에도 남지 않는다.
-- 주간 순위 베팅 정산과 순위 변동성 측정(게임이 예측 가능한지 동전던지기인지)은
-- 과거 시점 순위가 있어야 가능하고, 이력은 소급이 안 되므로 지금부터 매일 적재한다.
-- 적재는 크롤 직후(scripts/crawl-once.js → RPC snapshot_ranking) — 그날 데이터가
-- 반영된 순위를 그날의 스냅샷으로 고정한다.
--
-- score_rank: 합성 score(ranking.sql) 기준 순위 — 홈 정렬과 동일한 참고용.
-- trend_rank: naver_trend 7일 유량(flow) 기준 순위 — 베팅 정산용.
--   합성 score는 누적 문서수(저량) 소스가 섞여 주간 변동이 거의 없으므로
--   정산 기준으로 쓰지 않는다.

create table if not exists rank_snapshots (
  snapshot_date date    not null,  -- KST 기준 (크론 23:00 KST 직후 적재)
  meme_id       bigint  not null references memes(id) on delete cascade,
  score         numeric not null,  -- ranking.sql 합성 점수(낮을수록 상위)
  source_count  int     not null,  -- 잡힌 소스 수(확산 폭)
  score_rank    int     not null,
  trend_value   numeric,           -- naver_trend 7일 합 (없으면 null)
  trend_rank    int,               -- trend_value 있는 밈만 순위
  created_at    timestamptz not null default now(),
  primary key (snapshot_date, meme_id)
);

-- 밈 단위 시계열 조회용 (상세 페이지 차트, 영수증 검증)
create index if not exists rank_snapshots_meme_idx
  on rank_snapshots (meme_id, snapshot_date);

alter table rank_snapshots enable row level security;

-- 공개 읽기 (쓰기 정책 없음 → 쓰기는 service role 전용)
drop policy if exists "public read rank_snapshots" on rank_snapshots;
create policy "public read rank_snapshots" on rank_snapshots
  for select using (true);

-- ── 적재 RPC — 오늘(KST) 스냅샷. 같은 날 재실행하면 갱신(멱등). 반환: 적재 행 수 ──
create or replace function snapshot_ranking()
returns integer
language sql
security definer
set search_path = public
as $$
  with trend as (
    -- ranking.sql의 value 소스 7일 창과 동일 기준
    select meme_id, sum(value) as trend_value
    from mention_counts
    where source = 'naver_trend' and value is not null
      and day_bucket >= current_date - 7
    group by meme_id
  ),
  ranked as (
    select
      r.meme_id, r.score, r.source_count,
      dense_rank() over (order by r.score asc)::int as score_rank,
      t.trend_value,
      case when t.trend_value is not null
           then dense_rank() over (order by t.trend_value desc nulls last)::int
      end as trend_rank
    from meme_ranking r
    left join trend t on t.meme_id = r.meme_id
  ),
  ins as (
    insert into rank_snapshots
      (snapshot_date, meme_id, score, source_count, score_rank, trend_value, trend_rank)
    select (now() at time zone 'Asia/Seoul')::date,
           meme_id, score, source_count, score_rank, trend_value, trend_rank
    from ranked
    on conflict (snapshot_date, meme_id) do update set
      score        = excluded.score,
      source_count = excluded.source_count,
      score_rank   = excluded.score_rank,
      trend_value  = excluded.trend_value,
      trend_rank   = excluded.trend_rank,
      created_at   = now()
    returning 1
  )
  select count(*)::int from ins;
$$;

-- 익명/로그인 사용자가 PostgREST rpc로 임의 재적재하지 못하게 잠금 (service role 전용)
revoke execute on function snapshot_ranking() from public, anon, authenticated;
