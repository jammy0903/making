import type { RankMode } from './domain';

/** 처음 방문 시 채워 넣을 기본 주제들. 이름만 두고 id 는 심을 때 생성. */
export interface SampleTopic {
	title: string;
	description: string;
	defaultMode: RankMode;
	candidates: string[];
}

export const SAMPLE_TOPICS: SampleTopic[] = [
	{
		title: '🍿 최고의 야식',
		description: '밤에 딱 생각나는 그 음식',
		defaultMode: 'sort',
		candidates: ['치킨', '피자', '족발', '라면', '떡볶이', '곱창', '회', '마라탕']
	},
	{
		title: '🐶 키우고 싶은 반려동물',
		description: '함께 살고 싶은 친구는?',
		defaultMode: 'sort',
		candidates: ['강아지', '고양이', '햄스터', '앵무새', '고슴도치', '거북이', '토끼', '금붕어', '도마뱀', '페럿']
	},
	{
		title: '✈️ 가고 싶은 여행지',
		description: '지금 당장 떠난다면',
		defaultMode: 'sort',
		candidates: [
			'제주',
			'도쿄',
			'파리',
			'방콕',
			'뉴욕',
			'로마',
			'발리',
			'하와이',
			'스위스',
			'다낭',
			'오사카',
			'바르셀로나'
		]
	},
	{
		title: '☕ 카페 가면 시키는 음료',
		description: '내 최애 카페 메뉴',
		defaultMode: 'sort',
		candidates: [
			'아메리카노',
			'카페라떼',
			'바닐라라떼',
			'아이스티',
			'자몽에이드',
			'녹차라떼',
			'초코라떼',
			'콜드브루'
		]
	},
	{
		title: '🌸 최고의 계절',
		description: '너의 선택은?',
		defaultMode: 'drag',
		candidates: ['봄', '여름', '가을', '겨울']
	},
	{
		title: '🍗 치킨 먹을 때 최애 부위',
		description: '이 부위만큼은 양보 못 해',
		defaultMode: 'drag',
		candidates: ['닭다리', '닭날개', '봉', '닭가슴살', '닭목', '닭똥집']
	},
	{
		title: '🎮 명절에 하는 것',
		description: '연휴를 보내는 방법',
		defaultMode: 'sort',
		candidates: ['윷놀이', '고스톱', '낮잠', '넷플릭스', '산책', '게임', '수다', '먹기']
	},
	{
		title: '🍦 편의점 아이스크림',
		description: '더울 때 손이 가는 그것',
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
	}
];
