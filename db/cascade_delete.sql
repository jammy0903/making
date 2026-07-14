-- 밈 삭제 시 측정 데이터도 함께 삭제 (관리자 삭제 버튼용). SQL Editor에서 Run(1회).
-- meme_comments/meme_votes는 이미 on delete cascade. mention_counts만 cascade로 바꾼다.
alter table mention_counts drop constraint if exists mention_counts_meme_id_fkey;
alter table mention_counts add constraint mention_counts_meme_id_fkey
  foreign key (meme_id) references memes(id) on delete cascade;
