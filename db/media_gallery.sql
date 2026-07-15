-- 한 밈에 미디어 여러 개(인스타 캐러셀). SQL Editor에서 Run(재실행 안전).
-- media = jsonb 배열, 각 원소 { "type": "image"|"video", "url": "..." }. 순서 = 표시 순서.
-- 기존 photo_url/video_url는 하위호환(커버·폴백)으로 유지. media 비면 photo/video로 폴백.

alter table public.memes            add column if not exists media jsonb not null default '[]';
alter table public.meme_submissions add column if not exists media jsonb not null default '[]';

-- meme_cards 뷰: media 추가 (create or replace 제약상 맨 끝에 append)
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
  coalesce(vc.vote_notmeme, 0)   as vote_notmeme,
  m.video_url,
  m.media
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
