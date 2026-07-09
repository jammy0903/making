import type { RankMode } from './domain';

/**
 * 실제 이상형 월드컵 사이트(PIKU) 인기 순위를 반영한 기본 주제들.
 * - 인물/캐릭터 주제의 후보는 PIKU 랭킹 페이지의 실제 상위 후보를 그대로 사용(2026-07 기준).
 * - 성인향(여캠/BJ) 계열은 제외.
 * - 음식·사물 등 비인물 주제는 일반 상식 기반으로 구성.
 */
export interface SampleTopic {
	title: string;
	description: string;
	defaultMode: RankMode;
	candidates: string[];
	/** candidates 와 같은 순서의 이미지 URL. 생성된 주제만 채워진다(없으면 이름 앞글자 표시). */
	images?: string[];
}

export const SAMPLE_TOPICS: SampleTopic[] = [
	// ── PIKU 인기 상위: 인물/캐릭터 (실제 랭킹 상위 후보) ──
	{
		title: '💃 여자 아이돌 이상형 월드컵',
		description: '요즘 세대 걸그룹 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			'엔믹스 설윤',
			'하츠투하츠 이안',
			'에스파 윈터',
			'에스파 카리나',
			'아이브 장원영',
			'엔믹스 해원',
			'아이브 안유진',
			'프로미스나인 송하영',
			'뉴진스 해린',
			'베이비몬스터 아현'
		],
		images: [
			'/gen/girl-idol-00.webp',
			'/gen/girl-idol-01.webp',
			'/gen/girl-idol-02.webp',
			'/gen/girl-idol-03.webp',
			'/gen/girl-idol-04.webp',
			'/gen/girl-idol-05.webp',
			'/gen/girl-idol-06.webp',
			'/gen/girl-idol-07.webp',
			'/gen/girl-idol-08.webp',
			'/gen/girl-idol-09.webp'
		]
	},
	{
		title: '🕺 남자 아이돌 이상형 월드컵',
		description: '대세 남자 아이돌 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			'박지훈',
			'코르티스 건호',
			'NCT WISH 시온',
			'NCT 127 재현',
			'코르티스 성현',
			'보넥도 태산',
			'보넥도 명재현',
			'앤더블 한유진',
			'앤더블 장하오',
			'투어스 도훈'
		],
		images: [
			'/gen/boy-idol-00.webp',
			'/gen/boy-idol-01.webp',
			'/gen/boy-idol-02.webp',
			'/gen/boy-idol-03.webp',
			'/gen/boy-idol-04.webp',
			'/gen/boy-idol-05.webp',
			'/gen/boy-idol-06.webp',
			'/gen/boy-idol-07.webp',
			'/gen/boy-idol-08.webp',
			'/gen/boy-idol-09.webp'
		]
	},
	{
		title: '🎬 여자 배우 이상형 월드컵',
		description: '이쁜 여자 배우 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			'고윤정',
			'배수지',
			'신세경',
			'김태희',
			'김지원',
			'이지은',
			'박보영',
			'전지현',
			'임윤아',
			'김다미'
		],
		images: [
			'/gen/actress-00.webp',
			'/gen/actress-01.webp',
			'/gen/actress-02.webp',
			'/gen/actress-03.webp',
			'/gen/actress-04.webp',
			'/gen/actress-05.webp',
			'/gen/actress-06.webp',
			'/gen/actress-07.webp',
			'/gen/actress-08.webp',
			'/gen/actress-09.webp'
		]
	},
	{
		title: '🎥 남자 배우 이상형 월드컵',
		description: '멋진 남자 배우 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			'이도현',
			'박지훈',
			'박보검',
			'안효섭',
			'박형식',
			'이준영',
			'지창욱',
			'원빈',
			'신하균',
			'송강'
		],
		images: [
			'/gen/actor-00.webp',
			'/gen/actor-01.webp',
			'/gen/actor-02.webp',
			'/gen/actor-03.webp',
			'/gen/actor-04.webp',
			'/gen/actor-05.webp',
			'/gen/actor-06.webp',
			'/gen/actor-07.webp',
			'/gen/actor-08.webp',
			'/gen/actor-09.webp'
		]
	},
	{
		title: '🌸 애니 여자 캐릭터 월드컵',
		description: '최애 애니 여캐를 뽑아보자',
		defaultMode: 'sort',
		candidates: [
			'키타가와 마린',
			'와구리 카오루코',
			'아리사 미하일로브나 쿠죠',
			'루나미 야치요',
			'시키모리',
			'스오우 유키',
			'레제',
			'나나세 유즈키',
			'호시노 아이',
			'쿠로카와 아카네'
		],
		images: [
			'/gen/anime-girl-00.webp',
			'/gen/anime-girl-01.webp',
			'/gen/anime-girl-02.webp',
			'/gen/anime-girl-03.webp',
			'/gen/anime-girl-04.webp',
			'/gen/anime-girl-05.webp',
			'/gen/anime-girl-06.webp',
			'/gen/anime-girl-07.webp',
			'/gen/anime-girl-08.webp',
			'/gen/anime-girl-09.webp'
		]
	},
	{
		title: '⚔️ 애니·게임 남자 캐릭터 월드컵',
		description: '귀엽고 멋진 남캐 월드컵',
		defaultMode: 'sort',
		candidates: [
			'바니타스',
			'이누마키 토게',
			'마부치 코우',
			'하나코',
			'청샤오시',
			'요시다 하루',
			'카제하야 쇼타',
			'오레키 호타로',
			'미야무라 이즈미',
			'사쿠라 하루카'
		],
		images: [
			'/gen/anime-boy-00.webp',
			'/gen/anime-boy-01.webp',
			'/gen/anime-boy-02.webp',
			'/gen/anime-boy-03.webp',
			'/gen/anime-boy-04.webp',
			'/gen/anime-boy-05.webp',
			'/gen/anime-boy-06.webp',
			'/gen/anime-boy-07.webp',
			'/gen/anime-boy-08.webp',
			'/gen/anime-boy-09.webp'
		]
	},

	// ── 음식 계열 (PIKU 최다 인기 장르) ──
	{
		title: '🍔 최애 음식 이상형 월드컵',
		description: '여러분의 최애 음식은?',
		defaultMode: 'sort',
		candidates: [
			'치킨',
			'피자',
			'삼겹살',
			'초밥',
			'떡볶이',
			'햄버거',
			'짜장면',
			'라면',
			'김밥',
			'냉면',
			'마라탕',
			'곱창',
			'파스타',
			'돈까스',
			'족발',
			'회'
		],
		images: [
			'/gen/best-food-00.webp',
			'/gen/best-food-01.webp',
			'/gen/best-food-02.webp',
			'/gen/best-food-03.webp',
			'/gen/best-food-04.webp',
			'/gen/best-food-05.webp',
			'/gen/best-food-06.webp',
			'/gen/best-food-07.webp',
			'/gen/best-food-08.webp',
			'/gen/best-food-09.webp',
			'/gen/best-food-10.webp',
			'/gen/best-food-11.webp',
			'/gen/best-food-12.webp',
			'/gen/best-food-13.webp',
			'/gen/best-food-14.webp',
			'/gen/best-food-15.webp'
		]
	},
	{
		title: '🍜 최강 라면 월드컵',
		description: '최고의 라면을 가려보자',
		defaultMode: 'sort',
		candidates: [
			'신라면',
			'진라면',
			'너구리',
			'안성탕면',
			'짜파게티',
			'불닭볶음면',
			'삼양라면',
			'열라면',
			'무파마',
			'사리곰탕면',
			'팔도비빔면',
			'오징어짬뽕'
		],
		images: [
			'/gen/ramen-00.webp',
			'/gen/ramen-01.webp',
			'/gen/ramen-02.webp',
			'/gen/ramen-03.webp',
			'/gen/ramen-04.webp',
			'/gen/ramen-05.webp',
			'/gen/ramen-06.webp',
			'/gen/ramen-07.webp',
			'/gen/ramen-08.webp',
			'/gen/ramen-09.webp',
			'/gen/ramen-10.webp',
			'/gen/ramen-11.webp'
		]
	},
	{
		title: '🏪 편의점 음식 월드컵',
		description: '편의점에서 손이 가는 그것',
		defaultMode: 'sort',
		candidates: [
			'삼각김밥',
			'컵라면',
			'도시락',
			'핫바',
			'소시지',
			'샌드위치',
			'냉동만두',
			'즉석떡볶이',
			'감자칩',
			'젤리',
			'바나나우유',
			'컵과일'
		]
	},
	{
		title: '🍢 분식 월드컵',
		description: '분식집 최애 메뉴',
		defaultMode: 'sort',
		candidates: ['떡볶이', '김밥', '순대', '튀김', '라볶이', '쫄면', '우동', '만두', '어묵', '김말이'],
		images: [
			'/gen/bunsik-00.webp',
			'/gen/bunsik-01.webp',
			'/gen/bunsik-02.webp',
			'/gen/bunsik-03.webp',
			'/gen/bunsik-04.webp',
			'/gen/bunsik-05.webp',
			'/gen/bunsik-06.webp',
			'/gen/bunsik-07.webp',
			'/gen/bunsik-08.webp',
			'/gen/bunsik-09.webp'
		]
	},
	{
		title: '🛵 배달음식 월드컵',
		description: '오늘 뭐 시켜 먹지?',
		defaultMode: 'sort',
		candidates: ['치킨', '피자', '족발', '보쌈', '중국집', '떡볶이', '햄버거', '초밥', '곱창', '마라탕'],
		// best-food 이미지 재사용. 보쌈은 사진 없음(이름 표시), 중국집은 짜장면 이미지로 대표.
		images: [
			'/gen/best-food-00.webp', // 치킨
			'/gen/best-food-01.webp', // 피자
			'/gen/best-food-14.webp', // 족발
			'/gen/bossam.webp', // 보쌈
			'/gen/best-food-06.webp', // 중국집(짜장면 대표)
			'/gen/best-food-04.webp', // 떡볶이
			'/gen/best-food-05.webp', // 햄버거
			'/gen/best-food-03.webp', // 초밥
			'/gen/best-food-11.webp', // 곱창
			'/gen/best-food-10.webp' // 마라탕
		]
	},
	{
		title: '🍲 국물요리 월드컵',
		description: '뜨끈한 국물의 최강자',
		defaultMode: 'sort',
		candidates: [
			'김치찌개',
			'된장찌개',
			'부대찌개',
			'순두부찌개',
			'갈비탕',
			'설렁탕',
			'삼계탕',
			'육개장',
			'감자탕',
			'매운탕'
		],
		images: [
			'/gen/korean-stew-00.webp',
			'/gen/korean-stew-01.webp',
			'/gen/korean-stew-02.webp',
			'/gen/korean-stew-03.webp',
			'/gen/korean-stew-04.webp',
			'/gen/korean-stew-05.webp',
			'/gen/korean-stew-06.webp',
			'/gen/korean-stew-07.webp',
			'/gen/korean-stew-08.webp',
			'/gen/korean-stew-09.webp'
		]
	},
	{
		title: '🍚 국밥 월드컵',
		description: '해장엔 역시 국밥',
		defaultMode: 'sort',
		candidates: ['돼지국밥', '순대국밥', '소고기국밥', '콩나물국밥', '뼈해장국', '설렁탕', '곰탕', '육개장']
	},
	{
		title: '🌍 세계 음식 월드컵',
		description: '전 세계 요리 중 최애는?',
		defaultMode: 'sort',
		candidates: [
			'피자',
			'초밥',
			'파스타',
			'타코',
			'쌀국수',
			'팟타이',
			'스테이크',
			'딤섬',
			'케밥',
			'카레',
			'햄버거',
			'훠궈'
		],
		images: [
			'/gen/worldfood-00.webp',
			'/gen/worldfood-01.webp',
			'/gen/worldfood-02.webp',
			'/gen/worldfood-03.webp',
			'/gen/worldfood-04.webp',
			'/gen/worldfood-05.webp',
			'/gen/worldfood-06.webp',
			'/gen/worldfood-07.webp',
			'/gen/worldfood-08.webp',
			'/gen/worldfood-09.webp',
			'/gen/worldfood-10.webp',
			'/gen/worldfood-11.webp'
		]
	},
	{
		title: '🐔 치킨 브랜드 월드컵',
		description: '최애 치킨 브랜드',
		defaultMode: 'sort',
		candidates: [
			'교촌',
			'BBQ',
			'BHC',
			'굽네',
			'페리카나',
			'네네',
			'처갓집',
			'60계',
			'노랑통닭',
			'또래오래',
			'멕시카나',
			'부어치킨',
			'호식이두마리'
		],
		images: [
			'/gen/chicken-brand-00.webp',
			'/gen/chicken-brand-01.webp',
			'/gen/chicken-brand-02.webp',
			'/gen/chicken-brand-03.webp',
			'/gen/chicken-brand-04.webp',
			'/gen/chicken-brand-05.webp',
			'/gen/chicken-brand-06.webp',
			'/gen/chicken-brand-07.webp',
			'/gen/chicken-brand-08.webp',
			'/gen/chicken-brand-09.webp',
			'/gen/chicken-brand-10.webp',
			'/gen/chicken-brand-11.webp',
			'/gen/chicken-brand-12.webp'
		]
	},
	{
		title: '🥧 파이과자 월드컵',
		description: '촉촉한 파이류 최강자',
		defaultMode: 'sort',
		candidates: [
			'초코파이', '몽쉘', '오예스', '엄마손파이', '빅파이', '미쯔', '빈츠', '사브레',
			'카스타드', '쿠크다스', '후레쉬베리', '촉촉한초코칩', '로아커', '빠다코코낫', '키드오', '오뜨',
			'계란과자', '웨하스', '쌀로별', '조청유과', '찰떡파이'
		],
		images: [
			'/gen/pie-snack-00.webp', '/gen/pie-snack-01.webp', '/gen/pie-snack-02.webp', '/gen/pie-snack-03.webp',
			'/gen/pie-snack-04.webp', '/gen/pie-snack-05.webp', '/gen/pie-snack-06.webp', '/gen/pie-snack-07.webp', '/gen/pie-snack-08.webp',
			'/gen/pie-snack-09.webp', '/gen/pie-snack-10.webp', '/gen/pie-snack-11.webp', '/gen/pie-snack-12.webp', '/gen/pie-snack-13.webp',
			'/gen/pie-snack-14.webp', '/gen/pie-snack-15.webp', '/gen/pie-snack-16.webp', '/gen/pie-snack-17.webp', '/gen/pie-snack-18.webp', '/gen/pie-snack-19.webp',
			'/gen/pie-snack-20.webp'
		]
	},
	{
		title: '🍿 봉지과자 월드컵',
		description: '뜯으면 순삭되는 봉지과자',
		defaultMode: 'sort',
		candidates: [
			'새우깡', '꼬북칩', '오징어땅콩', '고래밥', '죠리퐁', '맛동산', '자갈치', '바나나킥',
			'꼬깔콘', '인디안밥', '오징어집', '알새우칩', '콘초', '콘칩', '신당동떡볶이과자', '꿀꽈배기',
			'오잉', '오사쯔', '사또밥', '카라멜콘', '썬칩', '메이플콘'
		],
		images: [
			'/gen/bag-snack-00.webp', '/gen/bag-snack-01.webp', '/gen/bag-snack-02.webp', '/gen/bag-snack-03.webp', '/gen/bag-snack-04.webp', '/gen/bag-snack-05.webp', '/gen/bag-snack-06.webp', '/gen/bag-snack-07.webp',
			'/gen/bag-snack-08.webp', '/gen/bag-snack-09.webp', '/gen/bag-snack-10.webp', '/gen/bag-snack-11.webp', '/gen/bag-snack-12.webp', '/gen/bag-snack-13.webp',
			'/gen/bag-snack-14.webp', '/gen/bag-snack-15.webp', '/gen/bag-snack-16.webp', '/gen/bag-snack-17.webp', '/gen/bag-snack-18.webp', '/gen/bag-snack-19.webp',
			'/gen/bag-snack-20.webp', '/gen/bag-snack-21.webp'
		]
	},
	{
		title: '🥔 감자과자 월드컵',
		description: '감자칩 계열 최강자',
		defaultMode: 'sort',
		candidates: [
			'포카칩', '프링글스', '오감자', '수미칩', '감자깡', '자가비', '눈을감자', '구운감자',
			'무뚝뚝', '포스틱', '허니버터칩', '레이즈', '촉촉한황치즈칩', '닭다리과자', '예감', '스윙칩',
			'프렌치프라이', '포테토칩', '오!감자', '감자별'
		],
		images: [
			'/gen/potato-snack-00.webp', '/gen/potato-snack-01.webp', '/gen/potato-snack-02.webp', '/gen/potato-snack-03.webp', '/gen/potato-snack-04.webp', '/gen/potato-snack-05.webp', '/gen/potato-snack-06.webp', '/gen/potato-snack-07.webp',
			'/gen/potato-snack-08.webp', '/gen/potato-snack-09.webp', '/gen/potato-snack-10.webp', '/gen/potato-snack-11.webp',
			'/gen/potato-snack-12.webp', '/gen/potato-snack-13.webp', '', '', '', '', '', ''
		]
	},
	{
		title: '🍫 단과자 월드컵',
		description: '달달한 과자 최강자',
		defaultMode: 'sort',
		candidates: [
			'초코파이', '몽쉘', '빼빼로', '초코송이', '오예스', '미쯔', '빈츠', '콘초',
			'빅파이', '엄마손파이', '뽀또', '사브레', '후레쉬베리', '쿠크다스', '마가렛트', '홈런볼',
			'칸쵸', '초코칩쿠키', '첵스초코', '하리보젤리', '초코하임', '화이트하임', '짱구과자'
		],
		images: [
			'/gen/sweet-snack-00.webp', '/gen/sweet-snack-01.webp', '/gen/sweet-snack-02.webp', '/gen/sweet-snack-03.webp',
			'/gen/sweet-snack-04.webp', '/gen/sweet-snack-05.webp', '/gen/sweet-snack-06.webp', '/gen/sweet-snack-07.webp', '/gen/sweet-snack-08.webp', '/gen/sweet-snack-09.webp', '/gen/sweet-snack-10.webp', '/gen/sweet-snack-11.webp',
			'/gen/sweet-snack-12.webp', '/gen/sweet-snack-13.webp', '/gen/sweet-snack-14.webp', '/gen/sweet-snack-15.webp', '/gen/sweet-snack-16.webp', '/gen/sweet-snack-17.webp',
			'/gen/sweet-snack-18.webp', '/gen/sweet-snack-19.webp', '/gen/sweet-snack-20.webp', '/gen/sweet-snack-21.webp', '/gen/sweet-snack-22.webp'
		]
	},
	{
		title: '🧂 짠과자 월드컵',
		description: '짭짤한 과자 최강자',
		defaultMode: 'sort',
		candidates: [
			'새우깡', '포카칩', '프링글스', '꼬북칩', '오징어땅콩', '자갈치', '감자깡', '에이스',
			'제크', '참크래커', '도리토스', '나쵸', '알새우칩', '오징어집', '인디안밥', '포스틱',
			'콘칩', '프레첼', '오잉', '오사쯔', '치킨팝'
		],
		images: [
			'/gen/salty-snack-00.webp', '/gen/salty-snack-01.webp', '/gen/salty-snack-02.webp', '/gen/salty-snack-03.webp', '/gen/salty-snack-04.webp', '/gen/salty-snack-05.webp', '/gen/salty-snack-06.webp', '/gen/salty-snack-07.webp', '/gen/salty-snack-08.webp', '/gen/salty-snack-09.webp',
			'/gen/salty-snack-10.webp', '/gen/salty-snack-11.webp', '/gen/salty-snack-12.webp', '/gen/salty-snack-13.webp',
			'/gen/salty-snack-14.webp', '/gen/salty-snack-15.webp', '/gen/salty-snack-16.webp', '/gen/salty-snack-17.webp',
			'/gen/salty-snack-18.webp', '/gen/salty-snack-19.webp', '/gen/salty-snack-20.webp'
		]
	},
	{
		title: '🍦 아이스크림 월드컵',
		description: '더울 때 생각나는 그것',
		defaultMode: 'sort',
		candidates: ['월드콘', '메로나', '죠스바', '스크류바', '빠삐코', '수박바', '비비빅', '설레임', '붕어싸만코', '돼지바']
	},
	{
		title: '🍩 디저트 월드컵',
		description: '달콤한 디저트 최강자',
		defaultMode: 'sort',
		candidates: ['마카롱', '티라미수', '케이크', '크로플', '도넛', '붕어빵', '호떡', '와플', '마들렌', '푸딩'],
		images: [
			'/gen/dessert-00.webp',
			'/gen/dessert-01.webp',
			'/gen/dessert-02.webp',
			'/gen/dessert-03.webp',
			'/gen/dessert-04.webp',
			'/gen/dessert-05.webp',
			'/gen/dessert-06.webp',
			'/gen/dessert-07.webp',
			'/gen/dessert-08.webp',
			'/gen/dessert-09.webp'
		]
	},
	{
		title: '🥐 빵 월드컵',
		description: '빵집 가면 담는 그 빵',
		defaultMode: 'sort',
		candidates: ['소금빵', '크루아상', '메론빵', '까눌레', '크로플', '마늘바게트', '베이글', '카스텔라', '식빵', '도넛'],
		images: [
			'/gen/bread-00.webp', // 소금빵
			'/gen/bread-01.webp', // 크루아상
			'/gen/bread-02.webp', // 메론빵
			'/gen/bread-03.webp', // 까눌레
			'/gen/bread-04.webp', // 크로플
			'/gen/bread-05.webp', // 마늘바게트
			'/gen/bread-06.webp', // 베이글
			'/gen/bread-07.webp', // 카스텔라
			'/gen/bread-08.webp', // 식빵
			'/gen/bread-09.webp' // 도넛
		]
	},
	{
		title: '🍡 길거리 간식 월드컵',
		description: '학교 앞 그 맛',
		defaultMode: 'sort',
		candidates: ['붕어빵', '호떡', '계란빵', '어묵', '순대', '군고구마', '핫도그', '타코야키', '와플', '떡꼬치'],
		images: [
			'/gen/street-00.webp',
			'/gen/street-01.webp',
			'/gen/street-02.webp',
			'/gen/street-03.webp',
			'/gen/street-04.webp',
			'/gen/street-05.webp',
			'/gen/street-06.webp',
			'/gen/street-07.webp',
			'/gen/street-08.webp',
			'/gen/street-09.webp'
		]
	},
	{
		title: '🍘 떡 월드컵',
		description: '쫀득한 떡의 최강자',
		defaultMode: 'drag',
		candidates: ['인절미', '백설기', '절편', '가래떡', '꿀떡', '시루떡', '무지개떡', '경단'],
		images: [
			'/gen/rice-cake-00.webp',
			'/gen/rice-cake-01.webp',
			'/gen/rice-cake-02.webp',
			'/gen/rice-cake-03.webp',
			'/gen/rice-cake-04.webp',
			'/gen/rice-cake-05.webp',
			'/gen/rice-cake-06.webp',
			'/gen/rice-cake-07.webp'
		]
	},

	// ── 음료 ──
	{
		title: '☕ 카페 월드컵',
		description: '최애 카페 브랜드는?',
		defaultMode: 'sort',
		candidates: [
			'스타벅스',
			'메가커피',
			'공차',
			'커스텀커피',
			'바나프레소',
			'우지커피',
			'투썸',
			'할리스',
			'폴바셋',
			'파스쿠찌',
			'더벤티',
			'이디야',
			'컴포즈',
			'빽다방',
			'블루보틀',
			'텐퍼센트',
			'아마스빈',
			'하삼동커피',
			'매머드커피',
			'감성커피',
			'아티제',
			'요거프레소',
			'포비',
			'빈브라더스',
			'만랩커피',
			'탐앤탐스',
			'드롭탑',
			'유동커피',
			'디저트39',
			'엔젤리너스',
			'카페베네',
			'달콤커피',
			'커피베이',
			'더리터',
			'카페봄봄',
			'카페051',
			'카페게이트',
			'팔공티',
			'쥬씨',
			'타이거슈가',
			'테라로사'
		],
		images: [
			'/gen/cafe-00.webp',
			'/gen/cafe-01.webp',
			'/gen/cafe-02.webp',
			'/gen/cafe-03.webp',
			'/gen/cafe-04.webp',
			'/gen/cafe-05.webp',
			'/gen/cafe-06.webp',
			'/gen/cafe-07.webp',
			'/gen/cafe-08.webp',
			'/gen/cafe-09.webp',
			'/gen/cafe-10.webp',
			'/gen/cafe-11.webp',
			'/gen/cafe-12.webp',
			'/gen/cafe-13.webp',
			'/gen/cafe-14.webp',
			'/gen/cafe-15.webp',
			'/gen/cafe-16.webp',
			'/gen/cafe-17.webp',
			'/gen/cafe-18.webp',
			'/gen/cafe-19.webp',
			'/gen/cafe-20.webp',
			'/gen/cafe-21.webp',
			'/gen/cafe-22.webp',
			'/gen/cafe-23.webp',
			'/gen/cafe-24.webp',
			'/gen/cafe-25.webp',
			'/gen/cafe-26.webp',
			'/gen/cafe-27.webp',
			'/gen/cafe-28.webp',
			'/gen/cafe-29.webp',
			'/gen/cafe-30.webp',
			'/gen/cafe-31.webp',
			'/gen/cafe-32.webp',
			'/gen/cafe-33.webp',
			'/gen/cafe-34.webp',
			'/gen/cafe-35.webp',
			'/gen/cafe-36.webp',
			'/gen/cafe-37.webp',
			'/gen/cafe-38.webp',
			'/gen/cafe-39.webp',
			'/gen/cafe-40.webp'
		]
	},
	{
		title: '🥤 탄산음료 월드컵',
		description: '톡 쏘는 최애 음료',
		defaultMode: 'sort',
		candidates: ['콜라', '사이다', '환타', '밀키스', '마운틴듀', '웰치스', '닥터페퍼', '스프라이트', '펩시', '칠성사이다']
	},
	{
		title: '🍺 술 월드컵',
		description: '오늘의 술은?',
		defaultMode: 'sort',
		candidates: ['소주', '맥주', '막걸리', '와인', '하이볼', '위스키', '사케', '칵테일', '청하', '과일소주']
	},

	// ── 과일·동물·기타 ──
	{
		title: '🍓 과일 월드컵',
		description: '가장 좋아하는 과일',
		defaultMode: 'sort',
		candidates: [
			'딸기',
			'수박',
			'포도',
			'복숭아',
			'망고',
			'샤인머스캣',
			'귤',
			'사과',
			'바나나',
			'참외',
			'체리',
			'파인애플'
		],
		images: [
			'/gen/fruit-00.webp',
			'/gen/fruit-01.webp',
			'/gen/fruit-02.webp',
			'/gen/fruit-03.webp',
			'/gen/fruit-04.webp',
			'/gen/fruit-05.webp',
			'/gen/fruit-06.webp',
			'/gen/fruit-07.webp',
			'/gen/fruit-08.webp',
			'/gen/fruit-09.webp',
			'/gen/fruit-10.webp',
			'/gen/fruit-11.webp'
		]
	},
	{
		title: '🐣 새끼동물 이상형 월드컵',
		description: '가장 귀여운 아기동물을 뽑아보세요',
		defaultMode: 'sort',
		candidates: [
			'강아지',
			'고양이',
			'햄스터',
			'토끼',
			'병아리',
			'아기펭귄',
			'아기판다',
			'새끼호랑이',
			'아기수달',
			'아기여우',
			'아기물범',
			'새끼사슴',
			'아기다람쥐',
			'고슴도치',
			'아기코알라',
			'아기알파카'
		],
		images: [
			'/gen/animal-00.webp',
			'/gen/animal-01.webp',
			'/gen/animal-02.webp',
			'/gen/animal-03.webp',
			'/gen/animal-04.webp',
			'/gen/animal-05.webp',
			'/gen/animal-06.webp',
			'/gen/animal-07.webp',
			'/gen/animal-08.webp',
			'/gen/animal-09.webp',
			'/gen/animal-10.webp',
			'/gen/animal-11.webp',
			'/gen/animal-12.webp',
			'/gen/animal-13.webp',
			'/gen/animal-14.webp',
			'/gen/animal-15.webp'
		]
	},
	{
		title: '🐾 반려동물 월드컵',
		description: '함께 살고 싶은 친구는?',
		defaultMode: 'sort',
		candidates: ['강아지', '고양이', '햄스터', '앵무새', '고슴도치', '거북이', '토끼', '금붕어', '도마뱀', '페럿'],
		images: [
			'/gen/pet-00.webp',
			'/gen/pet-01.webp',
			'/gen/pet-02.webp',
			'/gen/pet-03.webp',
			'/gen/pet-04.webp',
			'/gen/pet-05.webp',
			'/gen/pet-06.webp',
			'/gen/pet-07.webp',
			'/gen/pet-08.webp',
			'/gen/pet-09.webp'
		]
	},
	{
		title: '✈️ 가고 싶은 여행지 월드컵',
		description: '지금 당장 떠난다면',
		defaultMode: 'sort',
		candidates: [
			'교토',
			'도쿄',
			'파리',
			'방콕',
			'뉴욕',
			'로마',
			'시드니',
			'그랜드캐년',
			'리우데자네이루',
			'마추픽추',
			'산토리니',
			'바르셀로나',
			'서울',
			'두바이',
			'이스탄불',
			'베네치아',
			'베이징',
			'카이로',
			'아그라',
			'북극광'
		],
		images: [
			'/gen/travel-destination-00.webp', // 교토
			'/gen/travel-destination-01.webp', // 도쿄
			'/gen/travel-destination-02.webp', // 파리
			'/gen/travel-destination-03.webp', // 방콕
			'/gen/travel-destination-04.webp', // 뉴욕
			'/gen/travel-destination-05.webp', // 로마
			'/gen/travel-destination-06.webp', // 시드니
			'/gen/travel-destination-07.webp', // 그랜드캐년
			'/gen/travel-destination-08.webp', // 리우데자네이루
			'/gen/travel-destination-09.webp', // 마추픽추
			'/gen/travel-destination-10.webp', // 산토리니
			'/gen/travel-destination-11.webp', // 바르셀로나
			'/gen/travel-destination-12.webp', // 서울
			'/gen/travel-destination-13.webp', // 두바이
			'/gen/travel-destination-14.webp', // 이스탄불
			'/gen/travel-destination-15.webp', // 베네치아
			'/gen/travel-destination-16.webp', // 베이징
			'/gen/travel-destination-17.webp', // 카이로
			'/gen/travel-destination-18.webp', // 아그라
			'/gen/travel-destination-19.webp' // 북극광
		]
	},
	{
		title: '🔮 MBTI 월드컵',
		description: '내 스타일 유형은?',
		defaultMode: 'sort',
		candidates: [
			'ISTJ',
			'ISFJ',
			'INFJ',
			'INTJ',
			'ISTP',
			'ISFP',
			'INFP',
			'INTP',
			'ESTP',
			'ESFP',
			'ENFP',
			'ENTP',
			'ESTJ',
			'ESFJ',
			'ENFJ',
			'ENTJ'
		],
		images: [
			'/gen/mbti-00.webp',
			'/gen/mbti-01.webp',
			'/gen/mbti-02.webp',
			'/gen/mbti-03.webp',
			'/gen/mbti-04.webp',
			'/gen/mbti-05.webp',
			'/gen/mbti-06.webp',
			'/gen/mbti-07.webp',
			'/gen/mbti-08.webp',
			'/gen/mbti-09.webp',
			'/gen/mbti-10.webp',
			'/gen/mbti-11.webp',
			'/gen/mbti-12.webp',
			'/gen/mbti-13.webp',
			'/gen/mbti-14.webp',
			'/gen/mbti-15.webp'
		]
	},
	{
		title: '🌸 최고의 계절',
		description: '너의 선택은?',
		defaultMode: 'drag',
		candidates: ['봄', '여름', '가을', '겨울']
	}
];
