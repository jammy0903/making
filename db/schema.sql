-- 밈 사전 — Supabase 스키마 (디자인 반영 확장)
-- Supabase 대시보드 → SQL Editor에 통째로 붙여 Run. 재실행해도 안전(idempotent).
--
-- 전제: memes(id,name,keywords[])와 mention_counts(meme_id,comment_id,source,hour_bucket)는
--       이미 존재. 이 스크립트는 (1)memes에 표시용 컬럼 추가 (2)방문자 댓글·투표 테이블 신설
--       (3)프론트용 집계 뷰 (4)공개 읽기 + 방문자 쓰기 RLS 정책 을 더한다.
--
-- 역할 원칙: 밈 등록/수정은 운영자(service role, RLS 우회)만. 방문자는 댓글·투표만.

-- ─────────────────────────────────────────────────────────────
-- 1) memes 확장 — 디자인이 쓰는 표시용 필드
--    keywords[](매칭용)와 별개로 tags[](표시용 해시태그)를 둔다.
-- ─────────────────────────────────────────────────────────────
alter table memes add column if not exists description text;                       -- 뜻풀이
alter table memes add column if not exists tags        text[]  not null default '{}'; -- 표시용 #태그
alter table memes add column if not exists category    text;                        -- 스테디 분류(무한도전/래퍼/가수/배우/일반인/외국 …). new는 null 가능
alter table memes add column if not exists source      text;                        -- 출처
alter table memes add column if not exists status      text    not null default 'new'; -- 'new' | 'steady'
alter table memes add column if not exists photo_url   text;                        -- 사진/영상 URL (없으면 null)
alter table memes add column if not exists created_at  timestamptz not null default now(); -- 등록 시점("N일 전/N개월 전" 계산용)

-- status 값 가드
alter table memes drop constraint if exists memes_status_chk;
alter table memes add  constraint memes_status_chk check (status in ('new','steady'));

-- ─────────────────────────────────────────────────────────────
-- 2) 방문자 댓글 (사이트 방문자가 다는 댓글 — 크롤한 언급과는 별개)
-- ─────────────────────────────────────────────────────────────
create table if not exists meme_comments (
  id         bigint generated always as identity primary key,
  meme_id    bigint not null references memes(id) on delete cascade,
  nick       text   not null default '익명',
  body       text   not null,
  is_user    boolean not null default false,  -- 로그인 사용자면 true, 익명이면 false
  user_id    text,                            -- 로그인 식별자(있으면)
  created_at timestamptz not null default now()
);
create index if not exists meme_comments_meme_idx on meme_comments (meme_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3) 방문자 투표 ("지금도 웃겨?" 예/아니) — 1인 1표
--    voter_id는 클라이언트가 만든 브라우저 식별자(익명 게이지라 위조 가능성은 감수).
-- ─────────────────────────────────────────────────────────────
create table if not exists meme_votes (
  meme_id    bigint not null references memes(id) on delete cascade,
  voter_id   text   not null,
  choice     text   not null check (choice in ('yes','no')),
  created_at timestamptz not null default now(),
  primary key (meme_id, voter_id)   -- 같은 사람 재투표 무시
);
create index if not exists meme_votes_meme_idx on meme_votes (meme_id);

-- ─────────────────────────────────────────────────────────────
-- 3.5) 크롤한 언급의 이미지 URL — 이미지 있는 소스(핀터레스트 등)만 채워진다.
--      핀 이미지를 밈 카드에 띄우기 위한 대표 이미지 소스.
-- ─────────────────────────────────────────────────────────────
alter table mention_counts add column if not exists image_url text;

-- ─────────────────────────────────────────────────────────────
-- 4) 프론트용 집계 뷰 — 카드 한 장에 필요한 값 전부
--    mentions   = 우리가 측정한 언급량(mention_counts 행 수) → "얼마나 회자되나" 신호
--    comment_count = 방문자 댓글 수
--    vote_yes/no   = 투표 집계
--    last_activity = 최근 활동 시각(스테디 "지금도 이어지는 순" 정렬용)
--    photo_url  = 운영자가 넣은 memes.photo_url 우선, 없으면 최근 크롤 언급의 이미지
-- ─────────────────────────────────────────────────────────────
create or replace view meme_cards as
select
  m.id, m.name, m.description, m.tags, m.category, m.source,
  m.status, coalesce(m.photo_url, mi.image_url) as photo_url, m.created_at,
  coalesce(mc.mentions, 0)       as mentions,
  coalesce(cc.comment_count, 0)  as comment_count,
  coalesce(vc.vote_yes, 0)       as vote_yes,
  coalesce(vc.vote_no, 0)        as vote_no,
  greatest(
    m.created_at,
    coalesce(mc.last_mention, m.created_at),
    coalesce(cc.last_comment, m.created_at)
  ) as last_activity
from memes m
left join (
  select meme_id, count(*) as mentions, max(hour_bucket) as last_mention
  from mention_counts group by meme_id
) mc on mc.meme_id = m.id
-- 대표 이미지: 그 밈에 매칭된 언급 중 이미지가 있는 가장 최근 것 1건
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

-- 기존 meme_rankings 뷰는 유지(언급량만 필요할 때). meme_cards가 상위호환.

-- ─────────────────────────────────────────────────────────────
-- 5) RLS — 공개 읽기 + 방문자 쓰기(댓글·투표만). 밈/언급 쓰기는 service role만.
-- ─────────────────────────────────────────────────────────────
alter table memes          enable row level security;
alter table mention_counts enable row level security;
alter table meme_comments  enable row level security;
alter table meme_votes     enable row level security;

-- 공개 읽기
drop policy if exists "public read memes"    on memes;
create policy "public read memes"    on memes          for select using (true);
drop policy if exists "public read mentions" on mention_counts;
create policy "public read mentions" on mention_counts for select using (true);
drop policy if exists "public read comments" on meme_comments;
create policy "public read comments" on meme_comments  for select using (true);
drop policy if exists "public read votes"    on meme_votes;
create policy "public read votes"    on meme_votes      for select using (true);

-- 방문자 쓰기(댓글·투표만). 스팸/도배는 이후 신고·레이트리밋으로 보강.
drop policy if exists "public insert comments" on meme_comments;
create policy "public insert comments" on meme_comments for insert with check (true);
drop policy if exists "public insert votes"    on meme_votes;
create policy "public insert votes"    on meme_votes     for insert with check (true);

-- 참고: memes / mention_counts 에는 anon INSERT 정책을 두지 않는다.
--       → 방문자는 밈을 등록할 수 없다(기계·운영자만). service role 키는 RLS를 우회한다.

-- ─────────────────────────────────────────────────────────────
-- 6) (선택) 기존 시드 밈 분류·내용 채우기 템플릿
--    아래는 예시 한 줄. 나머지 밈의 description/tags/status/category는 운영자가 채운다.
--    (사실관계가 확실치 않은 뜻풀이를 여기서 임의로 넣지 않았음 — 직접 편집 권장)
-- ─────────────────────────────────────────────────────────────
-- update memes set
--   description = '이거 진짜야?라는 뜻의 감탄/확인 반응',
--   tags        = array['#반응','#감탄'],
--   status      = 'steady',
--   category    = '일반인'
-- where id = 2;   -- 난리자베스
