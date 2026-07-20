-- 사망(dead) 개념 제거 — 밈이 언제 것인지는 전성기 연도(era_year)가 말해준다.
-- SQL Editor에서 Run (재실행 안전).
--
-- 배경: 원래는 기계 신호(언급 소멸) × 인간 신호(사망 판정 여론)가 겹치면 관리자가
-- "사망 선고"를 내려 부고 구역으로 보냈다(db/death_lifecycle.sql). 전성기 연도를
-- 적으면 그게 곧 "언제 밈이었나"를 말해주므로 사망 선고·검토 자체를 없앤다.
--
-- 실행 시점 실측: status='dead' 0건, died_at 0건, death_review_at 0건
--   → 되돌릴 밈이 없어 데이터 손실 위험이 사실상 없다.
-- meme_cards에 의존하는 다른 뷰: 0개 → drop 후 재생성 안전.

begin;

-- ── 1) 혹시 남은 dead 밈을 steady로 (실행 시점 0건이지만 재실행·시차 대비) ──
update memes set status = 'steady', died_at = null, death_review_at = null
where status = 'dead';

-- ── 2) '죽은 밈이다'(choice='no') 투표 제거 ──
--   실측 30건 / 브라우저 5개. 전부 운영자 본인 테스트분임을 확인하고 지운다.
--   (voter_id는 사람이 아니라 브라우저 단위 식별자라 한 사람이 여러 개를 만든다)
delete from meme_votes where choice = 'no';

alter table meme_votes drop constraint if exists meme_votes_choice_check;
alter table meme_votes add  constraint meme_votes_choice_check
  check (choice in ('yes', 'notmeme'));

-- ── 3) 사망 후보 뷰 제거 ──
drop view if exists death_candidates;

-- ── 4) meme_cards 재정의 — died_at·vote_no 제거 ──
--   create or replace로는 컬럼을 뺄 수 없어(추가만 가능) drop 후 재생성한다.
--   ⚠️ drop하면 grant가 함께 날아가므로 아래에서 반드시 다시 부여할 것.
--   ⚠️ 이 정의는 운영 DB의 pg_get_viewdef를 그대로 옮긴 것이다 — name_en/tags_en/
--      description_en/photo_updated_at은 이 저장소의 어떤 마이그레이션에도 없고
--      DB에만 있었다. 임의로 재구성하면 영문 사이트가 깨진다.
drop view if exists meme_cards;

create view meme_cards as
select
  m.id,
  m.name,
  m.description,
  m.tags,
  m.category,
  m.source,
  m.status,
  coalesce(m.photo_url, mi.image_url) as photo_url,
  m.created_at,
  coalesce(mc.mentions, 0::bigint)      as mentions,
  coalesce(cc.comment_count, 0::bigint) as comment_count,
  coalesce(vc.vote_yes, 0::bigint)      as vote_yes,
  greatest(m.created_at, coalesce(mc.last_mention, m.created_at), coalesce(cc.last_comment, m.created_at)) as last_activity,
  coalesce(vc.vote_notmeme, 0::bigint)  as vote_notmeme,
  m.video_url,
  m.media,
  m.name_en,
  m.description_en,
  m.tags_en,
  m.photo_updated_at
from memes m
left join (
  select mention_counts.meme_id,
         count(*) as mentions,
         max(mention_counts.hour_bucket) as last_mention
  from mention_counts
  where mention_counts.value is null
  group by mention_counts.meme_id
) mc on mc.meme_id = m.id
left join lateral (
  select mention_counts.image_url
  from mention_counts
  where mention_counts.meme_id = m.id and mention_counts.image_url is not null
  order by mention_counts.hour_bucket desc
  limit 1
) mi on true
left join (
  select meme_comments.meme_id,
         count(*) as comment_count,
         max(meme_comments.created_at) as last_comment
  from meme_comments
  group by meme_comments.meme_id
) cc on cc.meme_id = m.id
left join (
  select recent.meme_id,
         count(*) filter (where recent.choice = 'yes'::text)     as vote_yes,
         count(*) filter (where recent.choice = 'notmeme'::text) as vote_notmeme
  from (
    select distinct on (meme_votes.meme_id, meme_votes.voter_id)
           meme_votes.meme_id, meme_votes.voter_id, meme_votes.choice
    from meme_votes
    where meme_votes.created_at > (now() - '90 days'::interval)
    order by meme_votes.meme_id, meme_votes.voter_id, meme_votes.created_at desc
  ) recent
  group by recent.meme_id
) vc on vc.meme_id = m.id;

-- drop으로 날아간 권한 복구 (기존과 동일하게)
grant select, insert, update, delete, truncate, references, trigger
  on meme_cards to anon, authenticated, postgres, service_role;

-- ── 5) status에서 dead 제거 ──
alter table memes drop constraint if exists memes_status_chk;
alter table memes add  constraint memes_status_chk check (status in ('new','steady'));

-- ── 6) 사망 전용 컬럼 제거 ──
alter table memes drop column if exists died_at;
alter table memes drop column if exists death_review_at;

commit;
