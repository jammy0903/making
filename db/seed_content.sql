-- 밈 콘텐츠 채우기 — 시드 밈 10개의 표시 정보(description·tags·status·category·source·photo_url)
-- 각 블록의 '' / array[...] / null 자리를 채운 뒤 Supabase SQL Editor에서 Run. 여러 번 실행해도 안전.
--
-- keywords(매칭용)는 이미 채워져 있어 여기서 안 건드림. tags는 "화면 표시용" 별개 태그다.
-- category 허용값: 무한도전 · 래퍼 · 가수 · 배우 · 일반인 · 외국  (new면 null)
-- status: 'new'(새로 올라온 탭) 또는 'steady'(스테디 탭)
-- created_at은 자동("N일 전" 계산). 더 오래된 것처럼 보이려면 created_at = now() - interval '14 months' 식으로.

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 1;  -- "좋다 이모지"  (keywords: 좋🤙다, 참 좋다👍, 머릿고기협회)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 2;  -- "난리자베스"  (keywords: 난리자베스, 자베스)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 3;  -- "매끈매끈하다"  (keywords: 매끈매끈하다, 매끈매끈한, 평평하다평평한)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 4;  -- "샤갈 야르 아자스"  (keywords: 샤갈, 야르, 아자스)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 5;  -- "냐냐냥"  (keywords: 냐냐냥)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 6;  -- "안정형 남친"  (keywords: 안정형남친, 불안형여친)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 7;  -- "갑차기스러운데"  (keywords: 갑차기, 고백취소해도돼)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 8;  -- "골반통신"  (keywords: 골반통신)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 9;  -- "밤티"  (keywords: 밤티)

update memes set
  description = '',
  tags        = array['#',''],
  status      = 'new',
  category    = null,
  source      = null,
  photo_url   = null
where id = 10; -- "그런데 이제"  (keywords: 그런데이제, 근데이제, 을곁들인)

-- 확인용:
-- select id, name, status, category, tags, description from memes order by id;
