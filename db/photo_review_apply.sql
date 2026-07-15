-- 사진 리뷰 반영 (2026-07-15). Supabase SQL Editor에 붙여넣고 Run.
-- ① 리뷰 대상 30개 사진 전부 초기화(고르지 않은 20개는 사진 없이 유지)
-- ② 고른 10개만 새 사진으로 교체. media는 비워 photo_url이 커버로 표시됨.

-- ① 초기화
update memes set photo_url = null, media = '[]'::jsonb
where id in (1,4,6,7,8,9,11,16,17,18,22,100,101,103,105,106,117,118,122,123,124,182,193,194,295,296,297,298,299,303);

-- ② 고른 10개
-- 골반통신 (4번)
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F5586%2F2025%2F10%2F27%2F0000006893_001_20251027191015460.jpg' where id = 8;
-- 야르 (2번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fcdn.instiz.net%2Fdata%2Fcached_img%2Fupload%2F2026%2F03%2F23%2F0%2F83739ec08e9ccf66dfdb1011929f762b.jpg' where id = 105;
-- 막나귀 (1번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fi1.sndcdn.com%2Favatars-000321295092-9e06qc-t500x500.jpg' where id = 123;
-- 테무판 (2번)
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F056%2F2021%2F06%2F09%2F0011059995_001_20210609091902803.jpg' where id = 124;
-- 칠가이 Chill Guy (4번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fi1.sndcdn.com%2Fartworks-SQ7jEqWpWqQIoDtE-quX3pw-t500x500.png' where id = 182;
-- OO가 되 (← 영크크의 2번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fi.pinimg.com%2F736x%2Fe5%2F31%2F3e%2Fe5313e648a98cd7932bf838a9e4138e5.jpg' where id = 193;
-- 장시간 비행 옆자리 (2번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fcdnimg.melon.co.kr%2Fsvc%2Fuser_images%2Fplylst%2F2022%2F10%2F381%2F87%2F516300462_org.jpg%3Ftm%3D20221021041609%2Fmelon%2Fresize%2F500%2Fquality%2F80%2Foptimize' where id = 296;
-- 도마도마 챌린지 (1번)
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=http%3A%2F%2Ffile3.instiz.net%2Fdata%2Fcached_img%2Fupload%2F2025%2F11%2F22%2F18%2F372fe1dd059371a2928c2338ec1233f2.gif' where id = 297;
-- 장항준적 사고 (2번)
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F003%2F2024%2F07%2F24%2FNISI20240724_0001611330_web_20240724155039_20240724160121321.jpg' where id = 299;
-- 닝닝닝닝 (2번)
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F109%2F2011%2F12%2F18%2F201112180923770476_1.jpg' where id = 303;
