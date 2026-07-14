-- 밈 순위 = rank aggregation (소스별 순위를 매긴 뒤 백분위로 정규화·축소해 합침)
-- SQL Editor에서 Run (재실행 안전).
--
-- 왜 이렇게? count(언급 7회)와 value(anchor의 13배)는 단위가 달라 직접 합산 불가.
-- 소스마다 밈을 줄세운 "순위"는 단위가 없으므로 비교/평균이 가능하다.
-- 이상치(어뷰징 포함)가 전체를 못 뒤집고, 한 소스가 죽어도 나머지 순위로 계산됨(격리 원칙).
--
-- v2 (docs/marketing-analysis.md §1 반영):
--  1) count 소스도 최근 7일 창 — 전 기간 누적이면 순위가 "역사상 많이 언급된 것"으로
--     수렴해 신상 밈이 못 올라온다. value 소스(7일 합)와 창을 정합.
--  2) 저커버리지 보정 — 마이너 소스 1곳 1등이 5개 소스 2등을 이기는 문제.
--     소스 안 등수를 백분위(0=1등, 1=꼴찌)로 정규화한 뒤 "가상의 꼴찌 소스 K=2개"를
--     섞어 평균(베이지안 축소). 참여 소스가 적을수록 꼴찌 쪽으로 끌려간다.
--     → 확산 폭(여러 소스 돌파 = 하위문화 경계 넘음)이 자연스럽게 가산점.
--     K를 키우면 확산 폭 가중↑, 줄이면 소수 소스 집중 밈에 관대해진다.

-- ── 1) (밈, 소스)별 지표 — 양쪽 모두 최근 7일 창 ──
--   value 소스(네이버): 7일 value 합. count 소스(댓글): 7일 언급 행 수.
create or replace view meme_source_metric as
select
  meme_id,
  source,
  coalesce(
    sum(value)  filter (where value is not null and day_bucket  >= current_date - 7),
    count(*)    filter (where value is null     and hour_bucket >= now() - interval '7 days')::numeric
  ) as metric
from mention_counts
group by meme_id, source;

-- ── 2) 소스 안에서 밈 줄세우기 (metric 큰 순 = 1위) + 그 소스의 참가 밈 수(pool) ──
--   pool은 백분위 분모: 100마리 중 3등과 3마리 중 3등을 구분하기 위함.
create or replace view meme_source_rank as
select
  meme_id, source, metric,
  dense_rank() over (partition by source order by metric desc) as rnk,
  count(*)    over (partition by source)                        as pool
from meme_source_metric
where metric > 0;

-- ── 3) 최종 랭킹 — 백분위 평균 + 축소(score 낮을수록 상위) ──
--   avg_rank(원시 평균 등수)는 참고·호환용으로 유지. 정렬 기준은 score.
--   score = (Σ백분위 + K×1.0) / (참여 소스 수 + K),  K=2, 백분위 = (rnk-1)/(pool-1)
--   측정 0건인 밈은 score=1.0(꼴찌 취급).
create or replace view meme_ranking as
select
  m.id as meme_id,
  m.name,
  round(avg(sr.rnk), 2) as avg_rank,      -- 참고용(낮을수록 상위)
  count(sr.source)      as source_count,  -- 몇 개 소스에서 잡혔나(확산 폭)
  round(
    ( coalesce(sum((sr.rnk - 1)::numeric / greatest(sr.pool - 1, 1)), 0) + 2 * 1.0 )
    / (count(sr.source) + 2)
  , 4) as score                           -- 정렬 기준(낮을수록 상위)
from memes m
left join meme_source_rank sr on sr.meme_id = m.id
group by m.id, m.name
order by score asc, source_count desc, m.id;
