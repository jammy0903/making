-- 판정 시계열 — 월 1회 재판정 + 게이지는 최근 90일 (SQL Editor에서 Run, 재실행 안전)
--
-- 왜(docs/marketing-analysis.md §3-3): 1표 영구제는 게이지를 밈 전성기에 화석화한다.
-- 밈이 나중에 죽어도 "죽었다"를 기록할 수단이 없다. 판정을 월 단위 시계열로 쌓으면
-- 사망 곡선(생존% 추이)이 데이터로 남고 — 이것이 "밈의 부고"의 원재료다.
-- 2단계(steady→dead 분기·재심 덱)는 이 시계열을 인간 신호로 소비한다.

-- ── 1) meme_votes: 월 버킷 추가 + PK 확장 (같은 달 중복만 거부, 다음 달 재판정 허용) ──
alter table meme_votes add column if not exists month_bucket date
  not null default (date_trunc('month', now()))::date;
update meme_votes set month_bucket = (date_trunc('month', created_at))::date;  -- 기존 표 이월
alter table meme_votes drop constraint if exists meme_votes_pkey;
alter table meme_votes add primary key (meme_id, voter_id, month_bucket);

-- ── 2) meme_cards: 게이지 = 최근 90일 내 "각 투표자의 최신 판정"만 집계 ──
--    (5월에 살았다→7월에 죽었다 한 사람은 죽었다 1표로만 센다. 옛 표는 자연 퇴장)
--    ⚠️ meme_cards 최신 정의는 이 파일이다 (schema.sql·naver_schema.sql의 구 정의를 대체).
create or replace view meme_cards as
select
  m.id, m.name, m.description, m.tags, m.category, m.source,
  m.status, coalesce(m.photo_url, mi.image_url) as photo_url, m.created_at,
  coalesce(mc.mentions, 0)       as mentions,
  coalesce(cc.comment_count, 0)  as comment_count,
  coalesce(vc.vote_yes, 0)       as vote_yes,
  coalesce(vc.vote_no, 0)        as vote_no,
  greatest(m.created_at, coalesce(mc.last_mention, m.created_at), coalesce(cc.last_comment, m.created_at)) as last_activity
from memes m
left join (
  select meme_id, count(*) as mentions, max(hour_bucket) as last_mention
  from mention_counts where value is null group by meme_id      -- 값-행 제외: 댓글 언급만
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
    order by meme_id, voter_id, created_at desc               -- 투표자별 최신 판정
  ) recent
  group by meme_id
) vc on vc.meme_id = m.id;
