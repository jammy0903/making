import type { RankMode } from './domain';

/**
 * 실제 이상형 월드컵 사이트(PIKU 등)에 존재하는 대표 주제들로 구성.
 * 초기엔 아이돌 중심이었으나 음식·동물·상황 등으로 확장된 실제 인기 장르를 반영.
 * (실존 인물 로스터는 정확 재현이 어려워 제외)
 */
export interface SampleTopic {
	title: string;
	description: string;
	defaultMode: RankMode;
	candidates: string[];
}

export const SAMPLE_TOPICS: SampleTopic[] = [
	{
		title: '🍔 인기있는 음식 월드컵',
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
		title: '🍜 라면 월드컵',
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
		]
	},
	{
		title: '🍫 과자 월드컵',
		description: '역대급 국민 과자는?',
		defaultMode: 'sort',
		candidates: [
			'새우깡',
			'포카칩',
			'홈런볼',
			'초코파이',
			'꼬북칩',
			'오징어땅콩',
			'맛동산',
			'예감',
			'프링글스',
			'죠리퐁',
			'카라멜콘',
			'고래밥',
			'빼빼로',
			'초코송이',
			'자갈치',
			'양파링'
		]
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
		]
	},
	{
		title: '🍦 아이스크림 월드컵',
		description: '더울 때 생각나는 최애 아이스크림',
		defaultMode: 'sort',
		candidates: [
			'월드콘',
			'메로나',
			'죠스바',
			'스크류바',
			'빠삐코',
			'수박바',
			'비비빅',
			'설레임',
			'붕어싸만코',
			'돼지바'
		]
	},
	{
		title: '🍗 치킨 월드컵',
		description: '최고의 치킨 메뉴는?',
		defaultMode: 'sort',
		candidates: [
			'후라이드',
			'양념',
			'간장',
			'파닭',
			'마늘치킨',
			'반반',
			'뿌링클',
			'허니콤보',
			'골드올리브',
			'맵단치킨'
		]
	}
];
