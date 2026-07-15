-- 사진(로컬 static/memes) + 텍스트 배치 업데이트. Supabase SQL Editor에서 Run.
-- 배포 후(사진이 memedics.space에서 서빙되기 시작한 뒤) 실행하는 걸 권장.

-- ① 사진
update memes set photo_url = '/memes/1.png', media = '[{"type": "image", "url": "/memes/1.png"}]'::jsonb where id = 1;
update memes set photo_url = '/memes/4.jpg', media = '[{"type": "image", "url": "/memes/4.jpg"}]'::jsonb where id = 4;
update memes set photo_url = '/memes/6.jpg', media = '[{"type": "image", "url": "/memes/6.jpg"}]'::jsonb where id = 6;
update memes set photo_url = '/memes/7.png', media = '[{"type": "image", "url": "/memes/7.png"}]'::jsonb where id = 7;
update memes set photo_url = '/memes/9.jpg', media = '[{"type": "image", "url": "/memes/9.jpg"}]'::jsonb where id = 9;
update memes set photo_url = '/memes/11.jpg', media = '[{"type": "image", "url": "/memes/11.jpg"}]'::jsonb where id = 11;
update memes set photo_url = '/memes/16.jpg', media = '[{"type": "image", "url": "/memes/16.jpg"}]'::jsonb where id = 16;
update memes set photo_url = '/memes/18.jpg', media = '[{"type": "image", "url": "/memes/18.jpg"}, {"type": "image", "url": "/memes/18_2.jpg"}]'::jsonb where id = 18;
update memes set photo_url = '/memes/19.webp', media = '[{"type": "image", "url": "/memes/19.webp"}]'::jsonb where id = 19;
update memes set photo_url = '/memes/22.jpg', media = '[{"type": "image", "url": "/memes/22.jpg"}]'::jsonb where id = 22;
update memes set photo_url = '/memes/29.jpg', media = '[{"type": "image", "url": "/memes/29.jpg"}]'::jsonb where id = 29;
update memes set photo_url = '/memes/57.png', media = '[{"type": "image", "url": "/memes/57.png"}]'::jsonb where id = 57;
update memes set photo_url = '/memes/100.webp', media = '[{"type": "image", "url": "/memes/100.webp"}]'::jsonb where id = 100;
update memes set photo_url = '/memes/101.webp', media = '[{"type": "image", "url": "/memes/101.webp"}]'::jsonb where id = 101;
update memes set photo_url = '/memes/102.jpg', media = '[{"type": "image", "url": "/memes/102.jpg"}, {"type": "image", "url": "/memes/102_2.jpg"}]'::jsonb where id = 102;
update memes set photo_url = '/memes/103.webp', media = '[{"type": "image", "url": "/memes/103.webp"}]'::jsonb where id = 103;
update memes set photo_url = '/memes/104.jpg', media = '[{"type": "image", "url": "/memes/104.jpg"}]'::jsonb where id = 104;
update memes set photo_url = '/memes/105.jpg', media = '[{"type": "image", "url": "/memes/105.jpg"}, {"type": "image", "url": "/memes/105_2.jpg"}]'::jsonb where id = 105;
update memes set photo_url = '/memes/106.jpg', media = '[{"type": "image", "url": "/memes/106.jpg"}]'::jsonb where id = 106;
update memes set photo_url = '/memes/109.png', media = '[{"type": "image", "url": "/memes/109.png"}]'::jsonb where id = 109;
update memes set photo_url = '/memes/115.webp', media = '[{"type": "image", "url": "/memes/115.webp"}]'::jsonb where id = 115;
update memes set photo_url = '/memes/116.jpg', media = '[{"type": "image", "url": "/memes/116.jpg"}]'::jsonb where id = 116;
update memes set photo_url = '/memes/117.png', media = '[{"type": "image", "url": "/memes/117.png"}, {"type": "image", "url": "/memes/117_2.jpg"}]'::jsonb where id = 117;
update memes set photo_url = '/memes/118.jpg', media = '[{"type": "image", "url": "/memes/118.jpg"}]'::jsonb where id = 118;
update memes set photo_url = '/memes/122.jpg', media = '[{"type": "image", "url": "/memes/122.jpg"}, {"type": "image", "url": "/memes/122_2.jpg"}]'::jsonb where id = 122;
update memes set photo_url = '/memes/123.jpg', media = '[{"type": "image", "url": "/memes/123.jpg"}, {"type": "image", "url": "/memes/123_2.jpg"}]'::jsonb where id = 123;
update memes set photo_url = '/memes/124.jpg', media = '[{"type": "image", "url": "/memes/124.jpg"}, {"type": "image", "url": "/memes/124_2.jpg"}]'::jsonb where id = 124;
update memes set photo_url = '/memes/137.jpg', media = '[{"type": "image", "url": "/memes/137.jpg"}]'::jsonb where id = 137;
update memes set photo_url = '/memes/167.jpg', media = '[{"type": "image", "url": "/memes/167.jpg"}]'::jsonb where id = 167;
update memes set photo_url = '/memes/193.jpg', media = '[{"type": "image", "url": "/memes/193.jpg"}, {"type": "image", "url": "/memes/193_2.jpg"}]'::jsonb where id = 193;
update memes set photo_url = '/memes/194.jpg', media = '[{"type": "image", "url": "/memes/194.jpg"}]'::jsonb where id = 194;
update memes set photo_url = '/memes/202.png', media = '[{"type": "image", "url": "/memes/202.png"}]'::jsonb where id = 202;
update memes set photo_url = '/memes/220.jpg', media = '[{"type": "image", "url": "/memes/220.jpg"}]'::jsonb where id = 220;
update memes set photo_url = '/memes/295.jpg', media = '[{"type": "image", "url": "/memes/295.jpg"}]'::jsonb where id = 295;
update memes set photo_url = '/memes/296.jpg', media = '[{"type": "image", "url": "/memes/296.jpg"}]'::jsonb where id = 296;
update memes set photo_url = '/memes/297.jpg', media = '[{"type": "image", "url": "/memes/297.jpg"}]'::jsonb where id = 297;
update memes set photo_url = '/memes/298.jpg', media = '[{"type": "image", "url": "/memes/298.jpg"}, {"type": "image", "url": "/memes/298_2.jpg"}]'::jsonb where id = 298;
update memes set photo_url = '/memes/302.jpg', media = '[{"type": "image", "url": "/memes/302.jpg"}]'::jsonb where id = 302;
update memes set photo_url = '/memes/303.jpg', media = '[{"type": "image", "url": "/memes/303.jpg"}]'::jsonb where id = 303;
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F5586%2F2025%2F10%2F27%2F0000006893_001_20251027191015460.jpg', media = '[]'::jsonb where id = 8;
update memes set photo_url = 'https://search.pstatic.net/sunny/?type=b150&src=https%3A%2F%2Fi1.sndcdn.com%2Fartworks-SQ7jEqWpWqQIoDtE-quX3pw-t500x500.png', media = '[]'::jsonb where id = 182;
update memes set photo_url = 'https://search.pstatic.net/common/?type=b150&src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F003%2F2024%2F07%2F24%2FNISI20240724_0001611330_web_20240724155039_20240724160121321.jpg', media = '[]'::jsonb where id = 299;

-- ② 텍스트(뜻·출처·이름·해시태그)
update memes set description = '장시간 비행 밈(Long-haul flight meme)은 비행기 좌석 배치도 위에 특정 애니메이션·영화 캐릭터나 연예인의 다양한 모습을 배치하고 ''8~10시간 비행을 한다면 어느 자리에 앉겠는가?''라며 선택을 유도하는 참여형 밈.', tags = array['참여형','밸런스게임','비행'] where id = 296;
update memes set source = 'https://www.youtube.com/shorts/yQKOIkinJSo' where id = 297;
update memes set source = 'https://youtu.be/Lq906SgaKOM?si=eTUO1mUMmeKW_Fkr', description = '게임 스트리머 알딘이 방송 중 아무 맥락 없이 내뱉은 ''괜찮아(닝닝닝닝)''가 팬 클립으로 퍼진 밈. 차가 부서져도 무작정 ''괜찮아''를 반복하는 한류 드라마 개그씬/곡조를 배경으로, 애써 한국말 ''괜찮아''를 반복하며 우는 인도네시아인 영상 밈 맥락과 닿아 있다.' where id = 303;
update memes set source = 'https://youtube.com/shorts/CGbOB-KfUJU?si=nh2dRV5EdvonfzV-' where id = 298;
update memes set description = '1월 7일 업로드된 개그맨 김해준의 유튜브 ''낭만부부''에서 인터뷰한 중년 시민이 보여준 손동작(🤙👍)이 화제가 되며 밈으로 자리잡음.' where id = 1;
update memes set description = '''싸갈''은 비속어 ''쌰갈''의 오타·변형으로 온라인에서 쓰이며, 욕설을 순화하거나 재미있게 표현하는 신조어(유행어).' where id = 4;
update memes set description = '''밤티''는 ''못생겼다·촌스럽다·별로다''를 뜻하는 신조어. 아바타 게임 ''라인플레이'' 유저(닉네임 밤티)의 독특한 아바타에 달린 원초적이고 황당한 댓글이 캡처돼 커뮤니티에서 유행하며 퍼졌다.' where id = 9;
update memes set description = '2024년 민생회복지원금(민생회복 소비쿠폰) 25만원을 받겠다며 더불어민주당을 지지한다는 이들을 ''배급''+''견''을 붙여 비꼬는 별명.' where id = 104;
update memes set description = '메이플스토리 ''창팝''에서 파생된, 모바일 게임 ''트릭컬 리바이브''를 주제로 만드는 AI 커버곡·자작곡을 통칭하는 2차 창작 밈.' where id = 103;
update memes set description = '''예카''는 ''예쁜 카페'', ''각할모''는 ''각자 할 일(공부·작업) 하는 모임''의 줄임말.' where id = 102;
update memes set description = '김풍 작가와 손종원 셰프의 다정한 커플 사진 구도를 지인들과 따라 하는 SNS 밈.' where id = 101;
update memes set name = '차은우 때문', description = '일상의 모든 불운과 안 좋은 일을 ''다 차은우 때문이다''라고 돌리는 해학적인 ''차은우 탓'' 밈. X(구 트위터) 등에서 확산.' where id = 17;
