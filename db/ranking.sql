-- 밈 순위 = rank aggregation (소스별 순위를 매긴 뒤 평균 순위로 합침)
-- SQL Editor에서 Run (재실행 안전).
--
-- 왜 이렇게? count(언급 7회)와 value(anchor의 13배)는 단위가 달라 직접 합산 불가.
-- 소스마다 밈을 줄세운 "순위"는 단위가 없으므로 비교/평균이 가능하다.
-- 이상치(어뷰징 포함)가 전체를 못 뒤집고, 한 소스가 죽어도 나머지 순위로 계산됨(격리 원칙).

-- ── 1) (밈, 소스)별 지표 ──
--   value 소스(네이버): 최근 7일 value 합. count 소스(댓글): 언급 행 수.
create or replace view meme_source_metric as
select
  meme_id,
  source,
  coalesce(
    sum(value) filter (where value is not null and day_bucket >= current_date - 7),
    count(*) filter (where value is null)::numeric
  ) as metric
from mention_counts
group by meme_id, source;

-- ── 2) 소스 안에서 밈 줄세우기 (metric 큰 순 = 1위) ──
create or replace view meme_source_rank as
select
  meme_id, source, metric,
  dense_rank() over (partition by source order by metric desc) as rnk
from meme_source_metric
where metric > 0;

-- ── 3) 평균 순위로 최종 랭킹 (참여 소스 많고 순위 높을수록 상위) ──
create or replace view meme_ranking as
select
  m.id as meme_id,
  m.name,
  round(avg(sr.rnk), 2) as avg_rank,      -- 낮을수록 상위
  count(sr.source)      as source_count   -- 몇 개 소스에서 잡혔나(신뢰도)
from memes m
left join meme_source_rank sr on sr.meme_id = m.id
group by m.id, m.name
order by avg(sr.rnk) asc nulls last, source_count desc, m.id;
