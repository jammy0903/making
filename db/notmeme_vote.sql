-- 투표 3지선다 — '밈이다(yes)' / '죽은 밈이다(no)' / '밈이 아니다(notmeme)'.
-- SQL Editor에서 Run(재실행 안전). 부고 판정(no 기준)은 그대로 두고 notmeme만 추가한다.
-- '밈이 아니다'는 death_candidates와 대칭인 notmeme_candidates 큐로 관리자 검토에 올린다.

-- ── 1) choice 제약 3값으로 완화 ──
alter table meme_votes drop constraint if exists meme_votes_choice_check;
alter table meme_votes add  constraint meme_votes_choice_check
  check (choice in ('yes', 'no', 'notmeme'));

-- ── 2) '밈 아님' 검토 쿨다운 컬럼 ──
alter table memes add column if not exists notmeme_review_at timestamptz;

-- ── 3) meme_cards 뷰: vote_notmeme 추가 (기존 정의 + 한 컬럼) ──
--   ⚠️ meme_cards 최신 정의는 이 파일이다 (death_lifecycle.sql 정의 + vote_notmeme).
create or replace view meme_cards as
select
  m.id, m.name, m.description, m.tags, m.category, m.source,
  m.status, coalesce(m.photo_url, mi.image_url) as photo_url, m.created_at,
  coalesce(mc.mentions, 0)       as mentions,
  coalesce(cc.comment_count, 0)  as comment_count,
  coalesce(vc.vote_yes, 0)       as vote_yes,
  coalesce(vc.vote_no, 0)        as vote_no,
  greatest(m.created_at, coalesce(mc.last_mention, m.created_at), coalesce(cc.last_comment, m.created_at)) as last_activity,
  m.died_at,
  coalesce(vc.vote_notmeme, 0)   as vote_notmeme   -- create or replace 제약상 맨 끝에 추가
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
         count(*) filter (where choice = 'yes')     as vote_yes,
         count(*) filter (where choice = 'no')      as vote_no,
         count(*) filter (where choice = 'notmeme') as vote_notmeme
  from (
    select distinct on (meme_id, voter_id) meme_id, voter_id, choice
    from meme_votes
    where created_at > now() - interval '90 days'
    order by meme_id, voter_id, created_at desc
  ) recent
  group by meme_id
) vc on vc.meme_id = m.id;

-- ── 4) notmeme_candidates: '밈 아님' 여론이 임계치 넘은 밈 (관리자 검토 큐) ──
--   조건: 최근 90일 투표자별 최신 판정 기준 10표↑ · '밈 아님' 70%↑ · 60일 재검토 쿨다운.
--   (death_candidates와 동일 패턴 — 확정/삭제는 사람이 결정)
create or replace view notmeme_candidates as
with recent_votes as (
  select distinct on (meme_id, voter_id) meme_id, voter_id, choice
  from meme_votes
  where created_at > now() - interval '90 days'
  order by meme_id, voter_id, created_at desc
), sig as (
  select meme_id,
         count(*)                                   as votes,
         count(*) filter (where choice = 'notmeme') as notmeme_votes
  from recent_votes group by meme_id
)
select m.id, m.name, m.category, m.status,
       s.votes, s.notmeme_votes,
       round(s.notmeme_votes::numeric / s.votes * 100) as notmeme_pct
from memes m
join sig s on s.meme_id = m.id
where s.votes >= 10
  and s.notmeme_votes::numeric / s.votes >= 0.7
  and (m.notmeme_review_at is null or m.notmeme_review_at < now() - interval '60 days')
order by notmeme_pct desc, s.votes desc;
