-- 사망 분류 — steady→dead 분기 (SQL Editor에서 Run, 재실행 안전)
--
-- 원칙(docs/marketing-analysis.md 로드맵 §7): 탄생도 죽음도 기계는 제안, 사람이 결정.
-- 기계 신호(언급 소멸)와 인간 신호(사망 판정 여론)가 모두 충족될 때만 "사망 후보"로
-- 올리고, 선고는 운영자가 내린다(신규 밈의 discovery_candidates 검토와 같은 패턴).
-- dead는 삭제가 아니라 전시(부고 구역)이며, 부활 경로를 남긴다(역주행 잦음).

-- ── 1) memes: dead 상태 + 사망 컬럼 ──
alter table memes drop constraint if exists memes_status_chk;
alter table memes add  constraint memes_status_chk check (status in ('new','steady','dead'));
alter table memes add column if not exists died_at         timestamptz;  -- 사망 선고 시각(부고 표기용)
alter table memes add column if not exists death_review_at timestamptz;  -- 마지막 검토 시각(기각 쿨다운)

-- ── 2) 사망 후보 뷰 — 두 신호 교차 시에만 후보로 ──
--   기계 신호: 최근 30일 댓글 언급(count 행) 0건 — "아무도 안 쓴다"
--   인간 신호: 최근 90일 최신 판정에서 사망 ≥ 70% AND 표 ≥ 10 — "죽었다고 본다"
--   기각 쿨다운: 검토(기각 포함) 후 60일간 재등장 안 함
--   ⚠️ 임계값(70%/10표/30일/60일)은 초기 가설 — 데이터 쌓이면 조정할 것.
create or replace view death_candidates as
with recent_votes as (
  select distinct on (meme_id, voter_id) meme_id, voter_id, choice
  from meme_votes
  where created_at > now() - interval '90 days'
  order by meme_id, voter_id, created_at desc
), vote_sig as (
  select meme_id,
         count(*)                              as votes,
         count(*) filter (where choice = 'no') as dead_votes
  from recent_votes group by meme_id
), mention_sig as (
  select meme_id, count(*) as mentions_30d
  from mention_counts
  where value is null and hour_bucket > now() - interval '30 days'
  group by meme_id
)
select m.id, m.name, m.category,
       v.votes, v.dead_votes,
       round(v.dead_votes::numeric / v.votes * 100) as dead_pct,
       coalesce(ms.mentions_30d, 0)                 as mentions_30d
from memes m
join vote_sig v        on v.meme_id  = m.id
left join mention_sig ms on ms.meme_id = m.id
where m.status = 'steady'
  and (m.death_review_at is null or m.death_review_at < now() - interval '60 days')
  and v.votes >= 10
  and v.dead_votes::numeric / v.votes >= 0.7
  and coalesce(ms.mentions_30d, 0) = 0;

-- ── 3) meme_cards: died_at 노출(부고 표기용 — 컬럼 끝에 추가라 재정의 안전) ──
--   ⚠️ meme_cards 최신 정의는 이 파일이다 (votes_lifecycle.sql의 정의 + died_at).
create or replace view meme_cards as
select
  m.id, m.name, m.description, m.tags, m.category, m.source,
  m.status, coalesce(m.photo_url, mi.image_url) as photo_url, m.created_at,
  coalesce(mc.mentions, 0)       as mentions,
  coalesce(cc.comment_count, 0)  as comment_count,
  coalesce(vc.vote_yes, 0)       as vote_yes,
  coalesce(vc.vote_no, 0)        as vote_no,
  greatest(m.created_at, coalesce(mc.last_mention, m.created_at), coalesce(cc.last_comment, m.created_at)) as last_activity,
  m.died_at
from memes m
left join (
  select meme_id, count(*) as mentions, max(hour_bucket) as last_mention
  from mention_counts where value is null group by meme_id
) mc on mc.meme_id = m.id
left join lateral (
  select image_url from mention_counts
  where meme_id = m.id and image_url is not null
  order by hour_bucket desc limit 1
) mi on true
left join (
  select meme_id, count(*) as comment_count, max(created_at) as last_comment
  from meme_comments group by meme_id
) cc on cc.meme_id = m.id
left join (
  select meme_id,
         count(*) filter (where choice = 'yes') as vote_yes,
         count(*) filter (where choice = 'no')  as vote_no
  from (
    select distinct on (meme_id, voter_id) meme_id, voter_id, choice
    from meme_votes
    where created_at > now() - interval '90 days'
    order by meme_id, voter_id, created_at desc
  ) recent
  group by meme_id
) vc on vc.meme_id = m.id;
