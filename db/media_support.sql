-- 미디어(사진/동영상) 지원 — 신청 폼 업로드 + 게시판(밈) 동영상. SQL Editor에서 Run(재실행 안전).
-- 신청은 Storage 파일 업로드, 게시판 밈은 URL(관리자). 신청 미디어는 관리자 승인 후 공개.

-- ── 1) 컬럼 ──
alter table public.meme_submissions add column if not exists photo_url text;
alter table public.meme_submissions add column if not exists video_url text;
alter table public.memes            add column if not exists video_url text;

-- ── 2) meme_cards 뷰: video_url 추가 (create or replace 제약상 맨 끝에 append) ──
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
  m.video_url
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

-- ── 3) Storage 버킷 'media' (공개 읽기, 50MB 제한) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- 정책: 공개 읽기 / 인증 사용자는 자기 폴더(uid/...)에만 업로드·삭제
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media auth upload" on storage.objects;
create policy "media auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media owner delete" on storage.objects;
create policy "media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
