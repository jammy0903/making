-- 잘못 매칭된 사진 내리기. Supabase SQL Editor에 붙여넣고 Run.
-- photo_url + media(캐러셀)를 모두 비운다. 밈 자체·댓글·투표는 그대로 유지.
-- 다시 사진 넣고 싶으면 관리자(/manage-8949 또는 상세 '✎ 편집')에서 URL 넣으면 됨.
--
-- 사용법: 아래 둘 중 편한 방식으로. 쓰는 블록의 이름/번호만 채우고 Run.
--   · 이름이 겹칠 일 거의 없지만, 확실히 하려면 id 방식이 안전.

-- ── 방식 A) 밈 이름으로 (홈에서 보이는 이름 그대로, 따옴표는 '' 로 두 번) ──
update memes
set photo_url = null,
    media = '[]'::jsonb
where name in (
  '여기에_틀린_밈이름',
  '또_다른_밈이름'
);

-- ── 방식 B) id로 (상세 페이지 URL /m/숫자 의 숫자, 또는 관리자에서 확인) ──
-- update memes
-- set photo_url = null,
--     media = '[]'::jsonb
-- where id in (5, 10, 33);
