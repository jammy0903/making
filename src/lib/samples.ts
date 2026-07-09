import type { RankMode } from './domain';

/**
 * 실제 이상형 월드컵 사이트(PIKU) 인기 순위를 반영한 기본 주제들.
 * - 인물/캐릭터 주제의 후보는 PIKU 랭킹 페이지의 실제 상위 후보를 그대로 사용(2026-07 기준).
 * - 성인향(여캠/BJ) 계열은 제외.
 * - 음식·사물 등 비인물 주제는 일반 상식 기반으로 구성.
 */
export interface SampleCandidate {
	/** 후보 이름(ko 원어). */
	name: string;
	/** 후보 사진 경로. 생성된 주제만 채워진다(없으면 이름 앞글자 표시). */
	image?: string;
}

export interface SampleTopic {
	/** 로케일 무관 ASCII 슬러그. SEO URL·결정적 id·번역 조회 키. 데이터의 정체성. */
	slug: string;
	title: string;
	description: string;
	defaultMode: RankMode;
	/** 이름·사진이 한 단위로 이동(인덱스 병렬 배열 결합 없음). */
	candidates: SampleCandidate[];
}

export const SAMPLE_TOPICS: SampleTopic[] = [
	{
		slug: 'girl-idol',
		title: '💃 여자 아이돌 이상형 월드컵',
		description: '요즘 세대 걸그룹 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			{ name: '엔믹스 설윤', image: '/gen/girl-idol-00.webp' },
			{ name: '하츠투하츠 이안', image: '/gen/girl-idol-01.webp' },
			{ name: '에스파 윈터', image: '/gen/girl-idol-02.webp' },
			{ name: '에스파 카리나', image: '/gen/girl-idol-03.webp' },
			{ name: '아이브 장원영', image: '/gen/girl-idol-04.webp' },
			{ name: '엔믹스 해원', image: '/gen/girl-idol-05.webp' },
			{ name: '아이브 안유진', image: '/gen/girl-idol-06.webp' },
			{ name: '프로미스나인 송하영', image: '/gen/girl-idol-07.webp' },
			{ name: '뉴진스 해린', image: '/gen/girl-idol-08.webp' },
			{ name: '베이비몬스터 아현', image: '/gen/girl-idol-09.webp' }
		]
	},
	{
		slug: 'boy-idol',
		title: '🕺 남자 아이돌 이상형 월드컵',
		description: '대세 남자 아이돌 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			{ name: '박지훈', image: '/gen/boy-idol-00.webp' },
			{ name: '코르티스 건호', image: '/gen/boy-idol-01.webp' },
			{ name: 'NCT WISH 시온', image: '/gen/boy-idol-02.webp' },
			{ name: 'NCT 127 재현', image: '/gen/boy-idol-03.webp' },
			{ name: '코르티스 성현', image: '/gen/boy-idol-04.webp' },
			{ name: '보넥도 태산', image: '/gen/boy-idol-05.webp' },
			{ name: '보넥도 명재현', image: '/gen/boy-idol-06.webp' },
			{ name: '앤더블 한유진', image: '/gen/boy-idol-07.webp' },
			{ name: '앤더블 장하오', image: '/gen/boy-idol-08.webp' },
			{ name: '투어스 도훈', image: '/gen/boy-idol-09.webp' }
		]
	},
	{
		slug: 'actress',
		title: '🎬 여자 배우 이상형 월드컵',
		description: '이쁜 여자 배우 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			{ name: '고윤정', image: '/gen/actress-00.webp' },
			{ name: '배수지', image: '/gen/actress-01.webp' },
			{ name: '신세경', image: '/gen/actress-02.webp' },
			{ name: '김태희', image: '/gen/actress-03.webp' },
			{ name: '김지원', image: '/gen/actress-04.webp' },
			{ name: '이지은', image: '/gen/actress-05.webp' },
			{ name: '박보영', image: '/gen/actress-06.webp' },
			{ name: '전지현', image: '/gen/actress-07.webp' },
			{ name: '임윤아', image: '/gen/actress-08.webp' },
			{ name: '김다미', image: '/gen/actress-09.webp' }
		]
	},
	{
		slug: 'actor',
		title: '🎥 남자 배우 이상형 월드컵',
		description: '멋진 남자 배우 (PIKU 인기 상위)',
		defaultMode: 'sort',
		candidates: [
			{ name: '이도현', image: '/gen/actor-00.webp' },
			{ name: '박지훈', image: '/gen/actor-01.webp' },
			{ name: '박보검', image: '/gen/actor-02.webp' },
			{ name: '안효섭', image: '/gen/actor-03.webp' },
			{ name: '박형식', image: '/gen/actor-04.webp' },
			{ name: '이준영', image: '/gen/actor-05.webp' },
			{ name: '지창욱', image: '/gen/actor-06.webp' },
			{ name: '원빈', image: '/gen/actor-07.webp' },
			{ name: '신하균', image: '/gen/actor-08.webp' },
			{ name: '송강', image: '/gen/actor-09.webp' }
		]
	},
	{
		slug: 'anime-girl',
		title: '🌸 애니 여자 캐릭터 월드컵',
		description: '최애 애니 여캐를 뽑아보자',
		defaultMode: 'sort',
		candidates: [
			{ name: '키타가와 마린', image: '/gen/anime-girl-00.webp' },
			{ name: '와구리 카오루코', image: '/gen/anime-girl-01.webp' },
			{ name: '아리사 미하일로브나 쿠죠', image: '/gen/anime-girl-02.webp' },
			{ name: '루나미 야치요', image: '/gen/anime-girl-03.webp' },
			{ name: '시키모리', image: '/gen/anime-girl-04.webp' },
			{ name: '스오우 유키', image: '/gen/anime-girl-05.webp' },
			{ name: '레제', image: '/gen/anime-girl-06.webp' },
			{ name: '나나세 유즈키', image: '/gen/anime-girl-07.webp' },
			{ name: '호시노 아이', image: '/gen/anime-girl-08.webp' },
			{ name: '쿠로카와 아카네', image: '/gen/anime-girl-09.webp' }
		]
	},
	{
		slug: 'anime-boy',
		title: '⚔️ 애니·게임 남자 캐릭터 월드컵',
		description: '귀엽고 멋진 남캐 월드컵',
		defaultMode: 'sort',
		candidates: [
			{ name: '바니타스', image: '/gen/anime-boy-00.webp' },
			{ name: '이누마키 토게', image: '/gen/anime-boy-01.webp' },
			{ name: '마부치 코우', image: '/gen/anime-boy-02.webp' },
			{ name: '하나코', image: '/gen/anime-boy-03.webp' },
			{ name: '청샤오시', image: '/gen/anime-boy-04.webp' },
			{ name: '요시다 하루', image: '/gen/anime-boy-05.webp' },
			{ name: '카제하야 쇼타', image: '/gen/anime-boy-06.webp' },
			{ name: '오레키 호타로', image: '/gen/anime-boy-07.webp' },
			{ name: '미야무라 이즈미', image: '/gen/anime-boy-08.webp' },
			{ name: '사쿠라 하루카', image: '/gen/anime-boy-09.webp' }
		]
	},
	{
		slug: 'best-food',
		title: '🍔 최애 음식 이상형 월드컵',
		description: '여러분의 최애 음식은?',
		defaultMode: 'sort',
		candidates: [
			{ name: '치킨', image: '/gen/best-food-00.webp' },
			{ name: '피자', image: '/gen/best-food-01.webp' },
			{ name: '삼겹살', image: '/gen/best-food-02.webp' },
			{ name: '초밥', image: '/gen/best-food-03.webp' },
			{ name: '떡볶이', image: '/gen/best-food-04.webp' },
			{ name: '햄버거', image: '/gen/best-food-05.webp' },
			{ name: '짜장면', image: '/gen/best-food-06.webp' },
			{ name: '라면', image: '/gen/best-food-07.webp' },
			{ name: '김밥', image: '/gen/best-food-08.webp' },
			{ name: '냉면', image: '/gen/best-food-09.webp' },
			{ name: '마라탕', image: '/gen/best-food-10.webp' },
			{ name: '곱창', image: '/gen/best-food-11.webp' },
			{ name: '파스타', image: '/gen/best-food-12.webp' },
			{ name: '돈까스', image: '/gen/best-food-13.webp' },
			{ name: '족발', image: '/gen/best-food-14.webp' },
			{ name: '회', image: '/gen/best-food-15.webp' }
		]
	},
	{
		slug: 'ramen',
		title: '🍜 최강 라면 월드컵',
		description: '최고의 라면을 가려보자',
		defaultMode: 'sort',
		candidates: [
			{ name: '신라면', image: '/gen/ramen-00.webp' },
			{ name: '진라면', image: '/gen/ramen-01.webp' },
			{ name: '너구리', image: '/gen/ramen-02.webp' },
			{ name: '안성탕면', image: '/gen/ramen-03.webp' },
			{ name: '짜파게티', image: '/gen/ramen-04.webp' },
			{ name: '불닭볶음면', image: '/gen/ramen-05.webp' },
			{ name: '삼양라면', image: '/gen/ramen-06.webp' },
			{ name: '열라면', image: '/gen/ramen-07.webp' },
			{ name: '무파마', image: '/gen/ramen-08.webp' },
			{ name: '사리곰탕면', image: '/gen/ramen-09.webp' },
			{ name: '팔도비빔면', image: '/gen/ramen-10.webp' },
			{ name: '오징어짬뽕', image: '/gen/ramen-11.webp' }
		]
	},
	{
		slug: 'convenience-store-food',
		title: '🏪 편의점 음식 월드컵',
		description: '편의점에서 손이 가는 그것',
		defaultMode: 'sort',
		candidates: [
			{ name: '삼각김밥' },
			{ name: '컵라면' },
			{ name: '도시락' },
			{ name: '핫바' },
			{ name: '소시지' },
			{ name: '샌드위치' },
			{ name: '냉동만두' },
			{ name: '즉석떡볶이' },
			{ name: '감자칩' },
			{ name: '젤리' },
			{ name: '바나나우유' },
			{ name: '컵과일' }
		]
	},
	{
		slug: 'bunsik',
		title: '🍢 분식 월드컵',
		description: '분식집 최애 메뉴',
		defaultMode: 'sort',
		candidates: [
			{ name: '떡볶이', image: '/gen/bunsik-00.webp' },
			{ name: '김밥', image: '/gen/bunsik-01.webp' },
			{ name: '순대', image: '/gen/bunsik-02.webp' },
			{ name: '튀김', image: '/gen/bunsik-03.webp' },
			{ name: '라볶이', image: '/gen/bunsik-04.webp' },
			{ name: '쫄면', image: '/gen/bunsik-05.webp' },
			{ name: '우동', image: '/gen/bunsik-06.webp' },
			{ name: '만두', image: '/gen/bunsik-07.webp' },
			{ name: '어묵', image: '/gen/bunsik-08.webp' },
			{ name: '김말이', image: '/gen/bunsik-09.webp' }
		]
	},
	{
		slug: 'delivery-food',
		title: '🛵 배달음식 월드컵',
		description: '오늘 뭐 시켜 먹지?',
		defaultMode: 'sort',
		candidates: [
			{ name: '치킨', image: '/gen/best-food-00.webp' },
			{ name: '피자', image: '/gen/best-food-01.webp' },
			{ name: '족발', image: '/gen/best-food-14.webp' },
			{ name: '보쌈', image: '/gen/bossam.webp' },
			{ name: '중국집', image: '/gen/best-food-06.webp' },
			{ name: '떡볶이', image: '/gen/best-food-04.webp' },
			{ name: '햄버거', image: '/gen/best-food-05.webp' },
			{ name: '초밥', image: '/gen/best-food-03.webp' },
			{ name: '곱창', image: '/gen/best-food-11.webp' },
			{ name: '마라탕', image: '/gen/best-food-10.webp' }
		]
	},
	{
		slug: 'korean-stew',
		title: '🍲 국물요리 월드컵',
		description: '뜨끈한 국물의 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '김치찌개', image: '/gen/korean-stew-00.webp' },
			{ name: '된장찌개', image: '/gen/korean-stew-01.webp' },
			{ name: '부대찌개', image: '/gen/korean-stew-02.webp' },
			{ name: '순두부찌개', image: '/gen/korean-stew-03.webp' },
			{ name: '갈비탕', image: '/gen/korean-stew-04.webp' },
			{ name: '설렁탕', image: '/gen/korean-stew-05.webp' },
			{ name: '삼계탕', image: '/gen/korean-stew-06.webp' },
			{ name: '육개장', image: '/gen/korean-stew-07.webp' },
			{ name: '감자탕', image: '/gen/korean-stew-08.webp' },
			{ name: '매운탕', image: '/gen/korean-stew-09.webp' }
		]
	},
	{
		slug: 'gukbap',
		title: '🍚 국밥 월드컵',
		description: '해장엔 역시 국밥',
		defaultMode: 'sort',
		candidates: [
			{ name: '돼지국밥' },
			{ name: '순대국밥' },
			{ name: '소고기국밥' },
			{ name: '콩나물국밥' },
			{ name: '뼈해장국' },
			{ name: '설렁탕' },
			{ name: '곰탕' },
			{ name: '육개장' }
		]
	},
	{
		slug: 'world-food',
		title: '🌍 세계 음식 월드컵',
		description: '전 세계 요리 중 최애는?',
		defaultMode: 'sort',
		candidates: [
			{ name: '피자', image: '/gen/worldfood-00.webp' },
			{ name: '초밥', image: '/gen/worldfood-01.webp' },
			{ name: '파스타', image: '/gen/worldfood-02.webp' },
			{ name: '타코', image: '/gen/worldfood-03.webp' },
			{ name: '쌀국수', image: '/gen/worldfood-04.webp' },
			{ name: '팟타이', image: '/gen/worldfood-05.webp' },
			{ name: '스테이크', image: '/gen/worldfood-06.webp' },
			{ name: '딤섬', image: '/gen/worldfood-07.webp' },
			{ name: '케밥', image: '/gen/worldfood-08.webp' },
			{ name: '카레', image: '/gen/worldfood-09.webp' },
			{ name: '햄버거', image: '/gen/worldfood-10.webp' },
			{ name: '훠궈', image: '/gen/worldfood-11.webp' }
		]
	},
	{
		slug: 'chicken-brand',
		title: '🐔 치킨 브랜드 월드컵',
		description: '최애 치킨 브랜드',
		defaultMode: 'sort',
		candidates: [
			{ name: '교촌', image: '/gen/chicken-brand-00.webp' },
			{ name: 'BBQ', image: '/gen/chicken-brand-01.webp' },
			{ name: 'BHC', image: '/gen/chicken-brand-02.webp' },
			{ name: '굽네', image: '/gen/chicken-brand-03.webp' },
			{ name: '페리카나', image: '/gen/chicken-brand-04.webp' },
			{ name: '네네', image: '/gen/chicken-brand-05.webp' },
			{ name: '처갓집', image: '/gen/chicken-brand-06.webp' },
			{ name: '60계', image: '/gen/chicken-brand-07.webp' },
			{ name: '노랑통닭', image: '/gen/chicken-brand-08.webp' },
			{ name: '또래오래', image: '/gen/chicken-brand-09.webp' },
			{ name: '멕시카나', image: '/gen/chicken-brand-10.webp' },
			{ name: '부어치킨', image: '/gen/chicken-brand-11.webp' },
			{ name: '호식이두마리', image: '/gen/chicken-brand-12.webp' }
		]
	},
	{
		slug: 'pie-snack',
		title: '🥧 파이과자 월드컵',
		description: '촉촉한 파이류 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '초코파이', image: '/gen/pie-snack-00.webp' },
			{ name: '몽쉘', image: '/gen/pie-snack-01.webp' },
			{ name: '오예스', image: '/gen/pie-snack-02.webp' },
			{ name: '엄마손파이', image: '/gen/pie-snack-03.webp' },
			{ name: '빅파이', image: '/gen/pie-snack-04.webp' },
			{ name: '미쯔', image: '/gen/pie-snack-05.webp' },
			{ name: '빈츠', image: '/gen/pie-snack-06.webp' },
			{ name: '사브레', image: '/gen/pie-snack-07.webp' },
			{ name: '카스타드', image: '/gen/pie-snack-08.webp' },
			{ name: '쿠크다스', image: '/gen/pie-snack-09.webp' },
			{ name: '후레쉬베리', image: '/gen/pie-snack-10.webp' },
			{ name: '촉촉한초코칩', image: '/gen/pie-snack-11.webp' },
			{ name: '로아커', image: '/gen/pie-snack-12.webp' },
			{ name: '빠다코코낫', image: '/gen/pie-snack-13.webp' },
			{ name: '키드오', image: '/gen/pie-snack-14.webp' },
			{ name: '오뜨', image: '/gen/pie-snack-15.webp' },
			{ name: '계란과자', image: '/gen/pie-snack-16.webp' },
			{ name: '웨하스', image: '/gen/pie-snack-17.webp' },
			{ name: '쌀로별', image: '/gen/pie-snack-18.webp' },
			{ name: '조청유과', image: '/gen/pie-snack-19.webp' },
			{ name: '찰떡파이', image: '/gen/pie-snack-20.webp' }
		]
	},
	{
		slug: 'bag-snack',
		title: '🍿 봉지과자 월드컵',
		description: '뜯으면 순삭되는 봉지과자',
		defaultMode: 'sort',
		candidates: [
			{ name: '새우깡', image: '/gen/bag-snack-00.webp' },
			{ name: '꼬북칩', image: '/gen/bag-snack-01.webp' },
			{ name: '오징어땅콩', image: '/gen/bag-snack-02.webp' },
			{ name: '고래밥', image: '/gen/bag-snack-03.webp' },
			{ name: '죠리퐁', image: '/gen/bag-snack-04.webp' },
			{ name: '맛동산', image: '/gen/bag-snack-05.webp' },
			{ name: '자갈치', image: '/gen/bag-snack-06.webp' },
			{ name: '바나나킥', image: '/gen/bag-snack-07.webp' },
			{ name: '꼬깔콘', image: '/gen/bag-snack-08.webp' },
			{ name: '인디안밥', image: '/gen/bag-snack-09.webp' },
			{ name: '오징어집', image: '/gen/bag-snack-10.webp' },
			{ name: '알새우칩', image: '/gen/bag-snack-11.webp' },
			{ name: '콘초', image: '/gen/bag-snack-12.webp' },
			{ name: '콘칩', image: '/gen/bag-snack-13.webp' },
			{ name: '신당동떡볶이과자', image: '/gen/bag-snack-14.webp' },
			{ name: '꿀꽈배기', image: '/gen/bag-snack-15.webp' },
			{ name: '오잉', image: '/gen/bag-snack-16.webp' },
			{ name: '오사쯔', image: '/gen/bag-snack-17.webp' },
			{ name: '사또밥', image: '/gen/bag-snack-18.webp' },
			{ name: '카라멜콘', image: '/gen/bag-snack-19.webp' },
			{ name: '썬칩', image: '/gen/bag-snack-20.webp' },
			{ name: '메이플콘', image: '/gen/bag-snack-21.webp' }
		]
	},
	{
		slug: 'potato-snack',
		title: '🥔 감자과자 월드컵',
		description: '감자칩 계열 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '포카칩', image: '/gen/potato-snack-00.webp' },
			{ name: '프링글스', image: '/gen/potato-snack-01.webp' },
			{ name: '오감자', image: '/gen/potato-snack-02.webp' },
			{ name: '수미칩', image: '/gen/potato-snack-03.webp' },
			{ name: '감자깡', image: '/gen/potato-snack-04.webp' },
			{ name: '자가비', image: '/gen/potato-snack-05.webp' },
			{ name: '눈을감자', image: '/gen/potato-snack-06.webp' },
			{ name: '구운감자', image: '/gen/potato-snack-07.webp' },
			{ name: '무뚝뚝', image: '/gen/potato-snack-08.webp' },
			{ name: '포스틱', image: '/gen/potato-snack-09.webp' },
			{ name: '허니버터칩', image: '/gen/potato-snack-10.webp' },
			{ name: '레이즈', image: '/gen/potato-snack-11.webp' },
			{ name: '촉촉한황치즈칩', image: '/gen/potato-snack-12.webp' },
			{ name: '닭다리과자', image: '/gen/potato-snack-13.webp' },
			{ name: '예감' },
			{ name: '스윙칩' },
			{ name: '프렌치프라이' },
			{ name: '포테토칩' },
			{ name: '오!감자' },
			{ name: '감자별' }
		]
	},
	{
		slug: 'sweet-snack',
		title: '🍫 단과자 월드컵',
		description: '달달한 과자 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '초코파이', image: '/gen/sweet-snack-00.webp' },
			{ name: '몽쉘', image: '/gen/sweet-snack-01.webp' },
			{ name: '빼빼로', image: '/gen/sweet-snack-02.webp' },
			{ name: '초코송이', image: '/gen/sweet-snack-03.webp' },
			{ name: '오예스', image: '/gen/sweet-snack-04.webp' },
			{ name: '미쯔', image: '/gen/sweet-snack-05.webp' },
			{ name: '빈츠', image: '/gen/sweet-snack-06.webp' },
			{ name: '콘초', image: '/gen/sweet-snack-07.webp' },
			{ name: '빅파이', image: '/gen/sweet-snack-08.webp' },
			{ name: '엄마손파이', image: '/gen/sweet-snack-09.webp' },
			{ name: '뽀또', image: '/gen/sweet-snack-10.webp' },
			{ name: '사브레', image: '/gen/sweet-snack-11.webp' },
			{ name: '후레쉬베리', image: '/gen/sweet-snack-12.webp' },
			{ name: '쿠크다스', image: '/gen/sweet-snack-13.webp' },
			{ name: '마가렛트', image: '/gen/sweet-snack-14.webp' },
			{ name: '홈런볼', image: '/gen/sweet-snack-15.webp' },
			{ name: '칸쵸', image: '/gen/sweet-snack-16.webp' },
			{ name: '초코칩쿠키', image: '/gen/sweet-snack-17.webp' },
			{ name: '첵스초코', image: '/gen/sweet-snack-18.webp' },
			{ name: '하리보젤리', image: '/gen/sweet-snack-19.webp' },
			{ name: '초코하임', image: '/gen/sweet-snack-20.webp' },
			{ name: '화이트하임', image: '/gen/sweet-snack-21.webp' },
			{ name: '짱구과자', image: '/gen/sweet-snack-22.webp' }
		]
	},
	{
		slug: 'salty-snack',
		title: '🧂 짠과자 월드컵',
		description: '짭짤한 과자 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '새우깡', image: '/gen/salty-snack-00.webp' },
			{ name: '포카칩', image: '/gen/salty-snack-01.webp' },
			{ name: '프링글스', image: '/gen/salty-snack-02.webp' },
			{ name: '꼬북칩', image: '/gen/salty-snack-03.webp' },
			{ name: '오징어땅콩', image: '/gen/salty-snack-04.webp' },
			{ name: '자갈치', image: '/gen/salty-snack-05.webp' },
			{ name: '감자깡', image: '/gen/salty-snack-06.webp' },
			{ name: '에이스', image: '/gen/salty-snack-07.webp' },
			{ name: '제크', image: '/gen/salty-snack-08.webp' },
			{ name: '참크래커', image: '/gen/salty-snack-09.webp' },
			{ name: '도리토스', image: '/gen/salty-snack-10.webp' },
			{ name: '나쵸', image: '/gen/salty-snack-11.webp' },
			{ name: '알새우칩', image: '/gen/salty-snack-12.webp' },
			{ name: '오징어집', image: '/gen/salty-snack-13.webp' },
			{ name: '인디안밥', image: '/gen/salty-snack-14.webp' },
			{ name: '포스틱', image: '/gen/salty-snack-15.webp' },
			{ name: '콘칩', image: '/gen/salty-snack-16.webp' },
			{ name: '프레첼', image: '/gen/salty-snack-17.webp' },
			{ name: '오잉', image: '/gen/salty-snack-18.webp' },
			{ name: '오사쯔', image: '/gen/salty-snack-19.webp' },
			{ name: '치킨팝', image: '/gen/salty-snack-20.webp' }
		]
	},
	{
		slug: 'ice-cream',
		title: '🍦 아이스크림 월드컵',
		description: '더울 때 생각나는 그것',
		defaultMode: 'sort',
		candidates: [
			{ name: '월드콘' },
			{ name: '메로나' },
			{ name: '죠스바' },
			{ name: '스크류바' },
			{ name: '빠삐코' },
			{ name: '수박바' },
			{ name: '비비빅' },
			{ name: '설레임' },
			{ name: '붕어싸만코' },
			{ name: '돼지바' }
		]
	},
	{
		slug: 'dessert',
		title: '🍩 디저트 월드컵',
		description: '달콤한 디저트 최강자',
		defaultMode: 'sort',
		candidates: [
			{ name: '마카롱', image: '/gen/dessert-00.webp' },
			{ name: '티라미수', image: '/gen/dessert-01.webp' },
			{ name: '케이크', image: '/gen/dessert-02.webp' },
			{ name: '크로플', image: '/gen/dessert-03.webp' },
			{ name: '도넛', image: '/gen/dessert-04.webp' },
			{ name: '붕어빵', image: '/gen/dessert-05.webp' },
			{ name: '호떡', image: '/gen/dessert-06.webp' },
			{ name: '와플', image: '/gen/dessert-07.webp' },
			{ name: '마들렌', image: '/gen/dessert-08.webp' },
			{ name: '푸딩', image: '/gen/dessert-09.webp' }
		]
	},
	{
		slug: 'bread',
		title: '🥐 빵 월드컵',
		description: '빵집 가면 담는 그 빵',
		defaultMode: 'sort',
		candidates: [
			{ name: '소금빵', image: '/gen/bread-00.webp' },
			{ name: '크루아상', image: '/gen/bread-01.webp' },
			{ name: '메론빵', image: '/gen/bread-02.webp' },
			{ name: '까눌레', image: '/gen/bread-03.webp' },
			{ name: '크로플', image: '/gen/bread-04.webp' },
			{ name: '마늘바게트', image: '/gen/bread-05.webp' },
			{ name: '베이글', image: '/gen/bread-06.webp' },
			{ name: '카스텔라', image: '/gen/bread-07.webp' },
			{ name: '식빵', image: '/gen/bread-08.webp' },
			{ name: '도넛', image: '/gen/bread-09.webp' }
		]
	},
	{
		slug: 'street-food',
		title: '🍡 길거리 간식 월드컵',
		description: '학교 앞 그 맛',
		defaultMode: 'sort',
		candidates: [
			{ name: '붕어빵', image: '/gen/street-00.webp' },
			{ name: '호떡', image: '/gen/street-01.webp' },
			{ name: '계란빵', image: '/gen/street-02.webp' },
			{ name: '어묵', image: '/gen/street-03.webp' },
			{ name: '순대', image: '/gen/street-04.webp' },
			{ name: '군고구마', image: '/gen/street-05.webp' },
			{ name: '핫도그', image: '/gen/street-06.webp' },
			{ name: '타코야키', image: '/gen/street-07.webp' },
			{ name: '와플', image: '/gen/street-08.webp' },
			{ name: '떡꼬치', image: '/gen/street-09.webp' }
		]
	},
	{
		slug: 'rice-cake',
		title: '🍘 떡 월드컵',
		description: '쫀득한 떡의 최강자',
		defaultMode: 'drag',
		candidates: [
			{ name: '인절미', image: '/gen/rice-cake-00.webp' },
			{ name: '백설기', image: '/gen/rice-cake-01.webp' },
			{ name: '절편', image: '/gen/rice-cake-02.webp' },
			{ name: '가래떡', image: '/gen/rice-cake-03.webp' },
			{ name: '꿀떡', image: '/gen/rice-cake-04.webp' },
			{ name: '시루떡', image: '/gen/rice-cake-05.webp' },
			{ name: '무지개떡', image: '/gen/rice-cake-06.webp' },
			{ name: '경단', image: '/gen/rice-cake-07.webp' }
		]
	},
	{
		slug: 'cafe-drink',
		title: '☕ 카페 월드컵',
		description: '최애 카페 브랜드는?',
		defaultMode: 'sort',
		candidates: [
			{ name: '스타벅스', image: '/gen/cafe-00.webp' },
			{ name: '메가커피', image: '/gen/cafe-01.webp' },
			{ name: '공차', image: '/gen/cafe-02.webp' },
			{ name: '커스텀커피', image: '/gen/cafe-03.webp' },
			{ name: '바나프레소', image: '/gen/cafe-04.webp' },
			{ name: '우지커피', image: '/gen/cafe-05.webp' },
			{ name: '투썸', image: '/gen/cafe-06.webp' },
			{ name: '할리스', image: '/gen/cafe-07.webp' },
			{ name: '폴바셋', image: '/gen/cafe-08.webp' },
			{ name: '파스쿠찌', image: '/gen/cafe-09.webp' },
			{ name: '더벤티', image: '/gen/cafe-10.webp' },
			{ name: '이디야', image: '/gen/cafe-11.webp' },
			{ name: '컴포즈', image: '/gen/cafe-12.webp' },
			{ name: '빽다방', image: '/gen/cafe-13.webp' },
			{ name: '블루보틀', image: '/gen/cafe-14.webp' },
			{ name: '텐퍼센트', image: '/gen/cafe-15.webp' },
			{ name: '아마스빈', image: '/gen/cafe-16.webp' },
			{ name: '하삼동커피', image: '/gen/cafe-17.webp' },
			{ name: '매머드커피', image: '/gen/cafe-18.webp' },
			{ name: '감성커피', image: '/gen/cafe-19.webp' },
			{ name: '아티제', image: '/gen/cafe-20.webp' },
			{ name: '요거프레소', image: '/gen/cafe-21.webp' },
			{ name: '포비', image: '/gen/cafe-22.webp' },
			{ name: '빈브라더스', image: '/gen/cafe-23.webp' },
			{ name: '만랩커피', image: '/gen/cafe-24.webp' },
			{ name: '탐앤탐스', image: '/gen/cafe-25.webp' },
			{ name: '드롭탑', image: '/gen/cafe-26.webp' },
			{ name: '유동커피', image: '/gen/cafe-27.webp' },
			{ name: '디저트39', image: '/gen/cafe-28.webp' },
			{ name: '엔젤리너스', image: '/gen/cafe-29.webp' },
			{ name: '카페베네', image: '/gen/cafe-30.webp' },
			{ name: '달콤커피', image: '/gen/cafe-31.webp' },
			{ name: '커피베이', image: '/gen/cafe-32.webp' },
			{ name: '더리터', image: '/gen/cafe-33.webp' },
			{ name: '카페봄봄', image: '/gen/cafe-34.webp' },
			{ name: '카페051', image: '/gen/cafe-35.webp' },
			{ name: '카페게이트', image: '/gen/cafe-36.webp' },
			{ name: '팔공티', image: '/gen/cafe-37.webp' },
			{ name: '쥬씨', image: '/gen/cafe-38.webp' },
			{ name: '타이거슈가', image: '/gen/cafe-39.webp' },
			{ name: '테라로사', image: '/gen/cafe-40.webp' }
		]
	},
	{
		slug: 'soda',
		title: '🥤 탄산음료 월드컵',
		description: '톡 쏘는 최애 음료',
		defaultMode: 'sort',
		candidates: [
			{ name: '콜라' },
			{ name: '사이다' },
			{ name: '환타' },
			{ name: '밀키스' },
			{ name: '마운틴듀' },
			{ name: '웰치스' },
			{ name: '닥터페퍼' },
			{ name: '스프라이트' },
			{ name: '펩시' },
			{ name: '칠성사이다' }
		]
	},
	{
		slug: 'alcohol',
		title: '🍺 술 월드컵',
		description: '오늘의 술은?',
		defaultMode: 'sort',
		candidates: [
			{ name: '소주' },
			{ name: '맥주' },
			{ name: '막걸리' },
			{ name: '와인' },
			{ name: '하이볼' },
			{ name: '위스키' },
			{ name: '사케' },
			{ name: '칵테일' },
			{ name: '청하' },
			{ name: '과일소주' }
		]
	},
	{
		slug: 'fruit',
		title: '🍓 과일 월드컵',
		description: '가장 좋아하는 과일',
		defaultMode: 'sort',
		candidates: [
			{ name: '딸기', image: '/gen/fruit-00.webp' },
			{ name: '수박', image: '/gen/fruit-01.webp' },
			{ name: '포도', image: '/gen/fruit-02.webp' },
			{ name: '복숭아', image: '/gen/fruit-03.webp' },
			{ name: '망고', image: '/gen/fruit-04.webp' },
			{ name: '샤인머스캣', image: '/gen/fruit-05.webp' },
			{ name: '귤', image: '/gen/fruit-06.webp' },
			{ name: '사과', image: '/gen/fruit-07.webp' },
			{ name: '바나나', image: '/gen/fruit-08.webp' },
			{ name: '참외', image: '/gen/fruit-09.webp' },
			{ name: '체리', image: '/gen/fruit-10.webp' },
			{ name: '파인애플', image: '/gen/fruit-11.webp' }
		]
	},
	{
		slug: 'baby-animal',
		title: '🐣 새끼동물 이상형 월드컵',
		description: '가장 귀여운 아기동물을 뽑아보세요',
		defaultMode: 'sort',
		candidates: [
			{ name: '강아지', image: '/gen/animal-00.webp' },
			{ name: '고양이', image: '/gen/animal-01.webp' },
			{ name: '햄스터', image: '/gen/animal-02.webp' },
			{ name: '토끼', image: '/gen/animal-03.webp' },
			{ name: '병아리', image: '/gen/animal-04.webp' },
			{ name: '아기펭귄', image: '/gen/animal-05.webp' },
			{ name: '아기판다', image: '/gen/animal-06.webp' },
			{ name: '새끼호랑이', image: '/gen/animal-07.webp' },
			{ name: '아기수달', image: '/gen/animal-08.webp' },
			{ name: '아기여우', image: '/gen/animal-09.webp' },
			{ name: '아기물범', image: '/gen/animal-10.webp' },
			{ name: '새끼사슴', image: '/gen/animal-11.webp' },
			{ name: '아기다람쥐', image: '/gen/animal-12.webp' },
			{ name: '고슴도치', image: '/gen/animal-13.webp' },
			{ name: '아기코알라', image: '/gen/animal-14.webp' },
			{ name: '아기알파카', image: '/gen/animal-15.webp' }
		]
	},
	{
		slug: 'pet',
		title: '🐾 반려동물 월드컵',
		description: '함께 살고 싶은 친구는?',
		defaultMode: 'sort',
		candidates: [
			{ name: '강아지', image: '/gen/pet-00.webp' },
			{ name: '고양이', image: '/gen/pet-01.webp' },
			{ name: '햄스터', image: '/gen/pet-02.webp' },
			{ name: '앵무새', image: '/gen/pet-03.webp' },
			{ name: '고슴도치', image: '/gen/pet-04.webp' },
			{ name: '거북이', image: '/gen/pet-05.webp' },
			{ name: '토끼', image: '/gen/pet-06.webp' },
			{ name: '금붕어', image: '/gen/pet-07.webp' },
			{ name: '도마뱀', image: '/gen/pet-08.webp' },
			{ name: '페럿', image: '/gen/pet-09.webp' }
		]
	},
	{
		slug: 'travel-destination',
		title: '✈️ 가고 싶은 여행지 월드컵',
		description: '지금 당장 떠난다면',
		defaultMode: 'sort',
		candidates: [
			{ name: '교토', image: '/gen/travel-destination-00.webp' },
			{ name: '도쿄', image: '/gen/travel-destination-01.webp' },
			{ name: '파리', image: '/gen/travel-destination-02.webp' },
			{ name: '방콕', image: '/gen/travel-destination-03.webp' },
			{ name: '뉴욕', image: '/gen/travel-destination-04.webp' },
			{ name: '로마', image: '/gen/travel-destination-05.webp' },
			{ name: '시드니', image: '/gen/travel-destination-06.webp' },
			{ name: '그랜드캐년', image: '/gen/travel-destination-07.webp' },
			{ name: '리우데자네이루', image: '/gen/travel-destination-08.webp' },
			{ name: '마추픽추', image: '/gen/travel-destination-09.webp' },
			{ name: '산토리니', image: '/gen/travel-destination-10.webp' },
			{ name: '바르셀로나', image: '/gen/travel-destination-11.webp' },
			{ name: '서울', image: '/gen/travel-destination-12.webp' },
			{ name: '두바이', image: '/gen/travel-destination-13.webp' },
			{ name: '이스탄불', image: '/gen/travel-destination-14.webp' },
			{ name: '베네치아', image: '/gen/travel-destination-15.webp' },
			{ name: '베이징', image: '/gen/travel-destination-16.webp' },
			{ name: '카이로', image: '/gen/travel-destination-17.webp' },
			{ name: '아그라', image: '/gen/travel-destination-18.webp' },
			{ name: '북극광', image: '/gen/travel-destination-19.webp' }
		]
	},
	{
		slug: 'mbti',
		title: '🔮 MBTI 월드컵',
		description: '내 스타일 유형은?',
		defaultMode: 'sort',
		candidates: [
			{ name: 'ISTJ', image: '/gen/mbti-00.webp' },
			{ name: 'ISFJ', image: '/gen/mbti-01.webp' },
			{ name: 'INFJ', image: '/gen/mbti-02.webp' },
			{ name: 'INTJ', image: '/gen/mbti-03.webp' },
			{ name: 'ISTP', image: '/gen/mbti-04.webp' },
			{ name: 'ISFP', image: '/gen/mbti-05.webp' },
			{ name: 'INFP', image: '/gen/mbti-06.webp' },
			{ name: 'INTP', image: '/gen/mbti-07.webp' },
			{ name: 'ESTP', image: '/gen/mbti-08.webp' },
			{ name: 'ESFP', image: '/gen/mbti-09.webp' },
			{ name: 'ENFP', image: '/gen/mbti-10.webp' },
			{ name: 'ENTP', image: '/gen/mbti-11.webp' },
			{ name: 'ESTJ', image: '/gen/mbti-12.webp' },
			{ name: 'ESFJ', image: '/gen/mbti-13.webp' },
			{ name: 'ENFJ', image: '/gen/mbti-14.webp' },
			{ name: 'ENTJ', image: '/gen/mbti-15.webp' }
		]
	},
	{
		slug: 'season',
		title: '🌸 최고의 계절',
		description: '너의 선택은?',
		defaultMode: 'drag',
		candidates: [
			{ name: '봄' },
			{ name: '여름' },
			{ name: '가을' },
			{ name: '겨울' }
		]
	}
];
