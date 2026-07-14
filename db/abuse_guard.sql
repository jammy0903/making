-- 어뷰징 가드 — SQL Editor에서 Run (재실행 안전).
--
-- 배경(docs/marketing-analysis.md §4-4): meme_votes/meme_comments는 익명 insert가
-- 열려 있어(RLS with check true) 무한 루프 스팸이 가능하다. "측정의 권위"가 상품이라
-- 게이지 조작은 브랜드 리스크. 서버 경유(IP 기반 제한)는 SvelteKit 이전에서 해결하고,
-- 그전까지 DB 레벨에서 막을 수 있는 것만 막는다.
--
-- 한계(정직하게): voter_id는 클라이언트 생성이라 새 id로 갈아끼우는 공격은 못 막는다.
-- 이 가드는 "고정 id로 도는 순진한 스팸 루프"와 "실수로 폭주하는 클라이언트"용이다.

-- ── 1) 투표: voter_id당 하루 50표 상한 ──
--    (사람이 하루에 낼 수 있는 상한을 넉넉히 잡음. 초과 시 insert 거부)
create index if not exists meme_votes_voter_idx on meme_votes (voter_id, created_at);

create or replace function meme_votes_rate_limit() returns trigger
language plpgsql security definer as $$
begin
  if (select count(*) from meme_votes
      where voter_id = new.voter_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'vote rate limit exceeded';
  end if;
  return new;
end $$;

drop trigger if exists meme_votes_rate_limit_trg on meme_votes;
create trigger meme_votes_rate_limit_trg
  before insert on meme_votes
  for each row execute function meme_votes_rate_limit();

-- ── 2) 댓글: 길이 상한 (1MB 덤프 같은 저장 공격 차단) ──
alter table meme_comments drop constraint if exists meme_comments_body_len_chk;
alter table meme_comments add  constraint meme_comments_body_len_chk check (char_length(body) <= 2000);
alter table meme_comments drop constraint if exists meme_comments_nick_len_chk;
alter table meme_comments add  constraint meme_comments_nick_len_chk check (char_length(nick) <= 40);
