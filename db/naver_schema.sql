-- 네이버 크롤러용 스키마 확장 — SQL Editor에서 Run (재실행 안전).
--
-- 네이버 트렌드/블로그/카페는 "밈별 일자 지표 값"(댓글 스트림이 아님)이라 매처를 안 탄다.
-- mention_counts에 value·day_bucket 컬럼을 더하고, 집계행은 comment_id='source:날짜'
-- 합성키로 기존 PK(meme_id, comment_id)를 재활용해 하루 1행 upsert 한다.

-- ── 1) mention_counts: 일자 지표 값 컬럼 ──
alter table mention_counts add column if not exists value      numeric;
alter table mention_counts add column if not exists day_bucket date;

-- ── 2) meme_cards 뷰: mentions는 "댓글 언급"만 세도록(값-행 제외) 갱신 ──
--    value가 있는 행(네이버 일자 지표)은 댓글 언급 카운트에서 빼야 기존 신호가 오염 안 됨.
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
  from meme_votes group by meme_id
) vc on vc.meme_id = m.id;

-- ── 3) 신상 밈 후보 큐 (meme_scout가 쌓기만; 등록은 운영자 수동) ──
create table if not exists discovery_candidates (
  id          bigint generated always as identity primary key,
  title       text not null,
  url         text not null unique,     -- 중복 자동 무시
  source_type text,                     -- naver_news / naver_blog ...
  found_at    timestamptz not null default now(),
  status      text not null default 'pending'  -- pending | registered | rejected
);
create index if not exists discovery_candidates_status_idx on discovery_candidates (status, found_at desc);

-- RLS: 후보 큐는 운영자 전용(공개 정책 없음 → service role만 접근).
alter table discovery_candidates enable row level security;
