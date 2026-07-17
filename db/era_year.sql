-- 세대 판독기 재료 — 밈 전성기 연도(era_year) + 인지도 수집(meme_awareness).
-- SQL Editor에서 Run (재실행 안전).
--
-- era_year: 밈이 "가장 뜨거웠던" 해. 등록일(created_at)과 무관한 큐레이션 값.
--   판독기(/era)는 이 값이 있는 밈만 출전시킨다 — 연도 확신이 없는 밈은 null 유지.
-- meme_awareness: '안다/모른다' 응답. 지금은 수집만 하고 어디에도 표시하지 않는다
--   (인지도 %는 표본이 쌓인 뒤 공개 — select 정책 없음 = anon은 쓰기만 가능).

alter table memes add column if not exists era_year int;

create table if not exists meme_awareness (
  meme_id    bigint  not null references memes(id) on delete cascade,
  voter_id   text    not null,  -- meme_votes와 동일한 브라우저 식별자
  knows      boolean not null,  -- 안다(true) / 모른다(false)
  created_at timestamptz not null default now(),
  primary key (meme_id, voter_id)  -- 브라우저당 밈 1회 — 중복 insert는 409(클라가 무시)
  -- 주의: ON CONFLICT upsert는 쓰지 말 것. 충돌 행 읽기에 select 정책이 필요해
  -- (이 테이블은 % 잠금 목적으로 select 정책이 없음) RLS 42501로 실패한다.
);

alter table meme_awareness enable row level security;

-- 쓰기만 공개, 읽기 정책 없음 → %는 잠김(service role만 집계 가능)
drop policy if exists "anyone insert awareness" on meme_awareness;
create policy "anyone insert awareness" on meme_awareness
  for insert with check (true);

-- ── era_readings: 판독 결과 + 실제 나이대 자기보고(정확도 측정용) ──
--   mental_year(판독값)와 age_band(실제)를 함께 저장해 상관/캘리브레이션 계산.
--   나이대별 평균 mental_year가 단조 증가하면 "판독기가 세대를 가른다"의 증거.
create table if not exists era_readings (
  id          bigint generated always as identity primary key,
  voter_id    text    not null,
  mental_year int     not null,
  known_count int     not null,
  total_count int     not null,
  age_band    text    not null check (age_band in ('~19','20-24','25-29','30-39','40+')),
  created_at  timestamptz not null default now()
);

alter table era_readings enable row level security;

-- awareness와 동일: insert만 공개, select 정책 없음(집계는 service role 전용)
drop policy if exists "anyone insert reading" on era_readings;
create policy "anyone insert reading" on era_readings
  for insert with check (true);

-- ── era_year 백필 — 전성기 연도 큐레이션(확신 있는 밈만) ──
update memes m set era_year = v.y
from (values
  -- ≤2012 레트로
  (786, 2005), -- Numa Numa
  (783, 2007), -- Charlie Bit My Finger
  (785, 2007), -- Chocolate Rain
  (453, 2007), -- I Can Has Cheezburger
  (375, 2008), -- Rickroll
  (526, 2008), -- Sparta Leonidas
  (342, 2008), -- 빠삐놈
  (457, 2009), -- Keyboard Cat
  (787, 2010), -- Double Rainbow
  (402, 2010), -- Trollface
  (93,  2010), -- 내가 고자라니
  (163, 2010), -- 한 뚝배기 하실래예
  (397, 2011), -- Nyan Cat
  (451, 2011), -- Y U NO
  (454, 2011), -- Rage Comics
  (396, 2011), -- One Does Not Simply
  (400, 2011), -- Success Kid
  (131, 2011), -- 홍철 없는 홍철팀
  (780, 2012), -- Gangnam Style Reaction
  (395, 2012), -- Bad Luck Brian
  (585, 2012), -- Overly Attached Girlfriend
  -- 2013-2016
  (376, 2013), -- Doge
  (779, 2013), -- Harlem Shake
  (393, 2013), -- Grumpy Cat
  (777, 2014), -- Ice Bucket Challenge
  (448, 2015), -- Press F to Pay Respects
  (378, 2016), -- Drake Hotline Bling
  (796, 2016), -- Gordon Ramsay Idiot Sandwich
  (203, 2016), -- 내가 이러려고 OO했나
  (266, 2016), -- 급식체
  (447, 2016), -- Harambe
  (778, 2016), -- Mannequin Challenge
  (386, 2016), -- Evil Kermit
  (392, 2016), -- This Is Fine
  (781, 2016), -- Damn Daniel
  (797, 2016), -- Confused Nick Young
  (799, 2016), -- Michael Jordan Crying
  -- 2017-2019
  (377, 2017), -- Distracted Boyfriend
  (382, 2017), -- Mocking SpongeBob
  (458, 2017), -- Salt Bae
  (798, 2017), -- Blinking White Guy
  (71,  2017), -- 롬곡옾높
  (72,  2017), -- 인정? 어 인정
  (139, 2017), -- 실화냐
  (204, 2017), -- 누가 기침소리를 내었어
  (92,  2017), -- 상상도 못한 정체
  (78,  2017), -- 현타
  (76,  2017), -- 존버
  (77,  2018), -- 가즈아
  (70,  2018), -- 갑분싸
  (73,  2018), -- JMT
  (75,  2018), -- 소확행
  (79,  2018), -- 인싸
  (379, 2018), -- Surprised Pikachu
  (383, 2018), -- Change My Mind
  (802, 2018), -- Weird Flex But OK
  (66,  2019), -- 사딸라
  (67,  2019), -- 묻고 더블로 가
  (215, 2019), -- 쓰앵님
  (68,  2019), -- 니가 왜 거기서 나와
  (380, 2019), -- Woman Yelling at a Cat
  (384, 2019), -- Stonks
  (180, 2019), -- OK Boomer
  (775, 2019), -- Bird Box Challenge
  -- 2020-2022
  (58,  2020), -- 1일 1깡
  (59,  2020), -- 테스형
  (60,  2020), -- 관짝소년단
  (390, 2020), -- Coffin Dance
  (61,  2020), -- 아무노래 챌린지
  (391, 2020), -- Among Us
  (62,  2020), -- 레게노
  (719, 2020), -- Money Printer Go Brrr
  (449, 2020), -- Karen
  (47,  2021), -- 무야호
  (48,  2021), -- 갓생
  (52,  2021), -- 킹받네
  (46,  2021), -- 어쩔티비
  (56,  2021), -- 제로투
  (200, 2021), -- 깐부
  (462, 2021), -- Bernie Mittens
  (38,  2022), -- 중꺾마
  (39,  2022), -- 알빠노
  (40,  2022), -- 누칼협
  (41,  2022), -- 그 잡채
  (42,  2022), -- 스불재
  (43,  2022), -- 소울리스좌
  (44,  2022), -- 이왜진
  (583, 2022), -- Will Smith Slapping Chris Rock
  (774, 2022), -- Emotional Damage
  (327, 2022), -- 재벌집 막내아들
  -- 2023-2024
  (31,  2023), -- 너 T야?
  (36,  2023), -- 다나카
  (33,  2023), -- 슬릭백
  (35,  2023), -- 도파민 중독
  (34,  2023), -- 홍박사님을 아세요
  (195, 2023), -- 멋지다 연진아
  (99,  2023), -- 하입보이요
  (353, 2023), -- 거지방
  (187, 2023), -- Skibidi
  (188, 2023), -- Rizz
  (467, 2023), -- Gyatt
  (468, 2023), -- Fanum Tax
  (465, 2023), -- Barbenheimer
  (463, 2023), -- Grimace Shake
  (464, 2023), -- Girl Dinner
  (27,  2024), -- 원영적 사고
  (28,  2024), -- 삐끼삐끼
  (30,  2024), -- 두바이 초콜릿
  (29,  2024), -- 마라탕후루
  (108, 2024), -- 밤양갱
  (111, 2024), -- 나야 들기름
  (116, 2024), -- 아파트 챌린지
  (328, 2024), -- 안성재 심사평
  (325, 2024), -- 선재 업고 튀어
  (324, 2024), -- 눈물의 여왕
  (182, 2024), -- Chill Guy
  (331, 2024), -- Demure
  (332, 2024), -- Brat
  (333, 2024), -- Moo Deng
  (414, 2024), -- Hawk Tuah
  (469, 2024), -- Mewing
  (9,   2024), -- 밤티
  (431, 2024), -- Dubai Chocolate
  -- 2025+
  (20,  2025), -- 지브리풍 AI 사진
  (304, 2025), -- 이탈리안 브레인로트
  (420, 2025), -- Tralalero Tralala
  (421, 2025), -- Tung Tung Tung Sahur
  (19,  2025), -- 치킨 조키
  (424, 2025), -- 6-7
  (432, 2025), -- Gen Z Stare
  (366, 2025), -- 바이브코딩
  (429, 2025), -- Jet2Holiday
  (425, 2025)  -- Gurt: Yo
) as v(id, y)
where m.id = v.id;
