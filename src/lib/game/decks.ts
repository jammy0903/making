/**
 * "그런데이제" 콘텐츠 덱 (하드코딩 MVP).
 * 정본 스펙: docs/game-design.md §C · §E-1. 출처: balance-game-plan §4.1·4.2, game-design §C-5.
 *
 * 페널티는 강도 2~10 (9장). 1판은 맨몸(페널티 없음) — A-2: "N판엔 강도-N 카드".
 * 강도 곡선은 3막 구조(자문 B-4): 2~3막 가벼운 웃음 / 4~7 현실적 트레이드오프 / 8~10 인생 결단.
 * 나중에 Supabase `decks` 테이블 로드로 교체(§E-1). 지금은 정적 데이터.
 */

/**
 * 주제 유형(docs/game-topic-types.md v2 §2). 유저가 선택 대상과 맺는 심리적 관계.
 * 이 태그가 문체 길이·결과 프레이밍·UI를 분기시킨다(§10-①).
 */
export type DeckType = 'attribute' | 'person' | 'scenario' | 'acquisition' | 'value';

/** 페널티 문체 기본 길이(§5-3). 짧은 조건 vs 긴 에피소드. */
export type PenaltyStyle = 'short' | 'long';

/** 결과 카드 프레이밍 키(§9 결과 프레이밍 행). Phase 1에서 verdictLine 분기에 사용. */
export type ResultFraming = 'preference' | 'tolerance' | 'strategy' | 'desire' | 'values';

/**
 * 결과 해석 모드(§3 결과 로직 충돌).
 * - `preference`: 현시선호. 버틴 깊이=진짜 취향, 잦은 스위치=결정장애(속성/인물/획득/가치).
 * - `strategy`: 전략 스타일. 스위치=상황 재계산이지 포기가 아님 → 잦은 스위치=적응형(상황형).
 */
export type ResultMode = 'preference' | 'strategy';

export interface TypeConfig {
	framing: ResultFraming;
	penaltyStyle: PenaltyStyle;
	resultMode: ResultMode;
}

/**
 * 유형별 기본 설정. 결과 로직·문체·프레이밍이 여기서 갈린다.
 * 덱별로 `penaltyStyleOverride`가 penaltyStyle을 덮어쓸 수 있다(§4 CLT 오버라이드).
 */
export const TYPE_CONFIG: Record<DeckType, TypeConfig> = {
	attribute: { framing: 'preference', penaltyStyle: 'short', resultMode: 'preference' },
	person: { framing: 'tolerance', penaltyStyle: 'long', resultMode: 'preference' },
	scenario: { framing: 'strategy', penaltyStyle: 'short', resultMode: 'strategy' }, // 중간 길이(≤25자)
	acquisition: { framing: 'desire', penaltyStyle: 'short', resultMode: 'preference' }, // 중간~짧(부작용형)
	value: { framing: 'values', penaltyStyle: 'short', resultMode: 'preference' }
};

export interface Penalty {
	/** 붙는 판 번호 = 강도 (2~10) */
	strength: number;
	/** "그런데 이제 ___" 뒤에 붙는 짧은 조건. 설명 말고 조건만(예: "히터 없음", "외투 1개뿐") */
	text: string;
}

export interface Side {
	name: string;
	emoji: string;
	/** 강도 2~10 순서대로 9장 */
	penalties: Penalty[];
}

export interface Deck {
	id: string;
	title: string;
	icon: string;
	/** 주제 유형(§2). 문체·결과 프레이밍·UI 분기의 기준. */
	type: DeckType;
	/** 유형 기본 문체를 덮어쓰는 덱별 오버라이드(§4 CLT). 없으면 TYPE_CONFIG[type] 사용. */
	penaltyStyleOverride?: PenaltyStyle;
	a: Side;
	b: Side;
}

/** 강도 2~10 텍스트 배열을 Penalty[]로 (인덱스 0 = 강도 2) */
function pens(texts: string[]): Penalty[] {
	return texts.map((text, i) => ({ strength: i + 2, text }));
}

export const DECKS: Deck[] = [
	{
		id: 'summer-winter',
		title: '여름 vs 겨울',
		icon: '🌡️',
		type: 'attribute',
		a: {
			name: '여름',
			emoji: '🌞',
			// 조건만 던지고 나머진 상상하게. 여름의 본질을 강도순으로 극대화.
			penalties: pens([
				'선풍기 1대뿐',
				'매일 열대야',
				'에어컨 없음',
				'모기장 없음',
				'하루종일 땀범벅',
				'온몸에 땀띠',
				'습도 90% 찜통',
				'사계절 내내 40도',
				'평생 여름만'
			])
		},
		b: {
			name: '겨울',
			emoji: '❄️',
			// 겨울의 본질을 강도순으로 극대화. 여름과 대칭.
			penalties: pens([
				'외투 1개뿐',
				'매일 손발 시림',
				'히터 없음',
				'이불 밖 금지',
				'손 트고 입술 갈라짐',
				'매일 빙판길',
				'손발 동상',
				'사계절 내내 영하 20도',
				'평생 겨울만'
			])
		}
	},
	{
		id: 'marriage',
		title: '결혼한다면? 얼굴천재 vs 개그천재',
		icon: '💍',
		type: 'person',
		a: {
			name: '얼굴천재',
			emoji: '🤩',
			// 1막 가벼운 웃음 · 2막 현실 트레이드오프 · 3막 인생 결단
			penalties: pens([
				'코골이에 이갈이 풀세트여도',
				'거울 앞을 못 지나쳐 매번 1시간 늦어도',
				'데이트마다 본인 셀카 200장 찍느라 넌 뒷전이어도',
				'분위기 잡다 갑자기 배 아프다며 매번 뛰쳐나가도',
				'화장실 문 안 닫고 큰일 보며 말 걸어도',
				'월급 전부 피부과·옷에 쓰고 생활비는 네가 다 내도',
				'전 애인 20명이 아직 연락 오고 답장도 해도',
				'시어머니가 열쇠 들고 예고 없이 들이닥쳐도',
				'평생 잘생겼지만 평생 철은 안 들어도'
			])
		},
		b: {
			name: '개그천재',
			emoji: '😆',
			penalties: pens([
				'같이 찍은 사진마다 너만 잘 나와도',
				'진지한 얘기마다 5초에 한 번 드립쳐도',
				'중요한 순간마다 방귀로 분위기 깨도',
				'프러포즈도 개그로 해서 감동이 0이어도',
				'친구들이 "왜 하필 쟤?"를 매번 물어봐도',
				'집에선 안 웃기고 밖에서만 인싸여도',
				'예능 스케줄로 신혼집을 자주 비워도',
				'장모님 앞에서까지 드립치다 미움받아도',
				'평생 안 잘생겼어도'
			])
		}
	},
	{
		id: 'superpower',
		title: '초능력 딱 하나: 비행 vs 순간이동',
		icon: '🦸',
		type: 'acquisition',
		a: {
			name: '비행',
			emoji: '🕊️',
			// 획득형(§2 유형4): 능력 자체의 부작용·제약. "그래도 쓸 수 있으면…"을 유발.
			// 10장이 동시에 성립(§5-2): 저고도·저속으로 하루종일 떠 있는 세계.
			penalties: pens([
				'속도가 딱 걷는 만큼이어도',
				'지붕 높이까지만 떠도',
				'방향은 바람 부는 대로여도',
				'착지마다 엉덩방아 찧어도',
				'비둘기 떼가 늘 따라붙어도',
				'5분 넘으면 멀미로 토해도',
				'뜰 때마다 신발이 벗겨져도',
				'잘 때도 붕 떠서 이불이 흘러내려도',
				'한번 뜨면 하루종일 못 내려와도'
			])
		},
		b: {
			name: '순간이동',
			emoji: '🌀',
			// 짧은 거리·저정밀 순간이동의 부작용. 비행과 대칭(둘 다 이동 능력이라 팽팽).
			penalties: pens([
				'딱 10m씩만 이동돼도',
				'도착하면 늘 뒤돌아 서 있어도',
				'입은 옷은 안 따라와도',
				'이동 후 5초간 어지러워도',
				'가끔 벽에 반쯤 박혀 나와도',
				'하루 딱 3번만 써도',
				'쓸 때마다 속 뒤집혀 토해도',
				'목적지가 몇 미터씩 어긋나도',
				'한번 쓰면 하루종일 손이 떨려도'
			])
		}
	},
	{
		id: 'zombie',
		title: '좀비 사태: 도망친다 vs 싸운다',
		icon: '🧟',
		type: 'scenario',
		a: {
			name: '도망',
			emoji: '🏃',
			// 상황형(§2 유형3): 그 행동을 계속했을 때 자연스러운 대가. 외부 사건 금지, ≤25자.
			// 도망을 고수할수록 나빠지는 방향(§5-2 동시 성립). 뇌절 톤(병맛·gross·처절코믹).
			penalties: pens([
				'신발 한 짝만 신고 뛰어도',
				'뛰다 방귀가 계속 새어 나가도',
				'똥이 마려운데 참고 뛰어도',
				'코피가 멈추질 않고 흘러도',
				'발톱이 하나씩 빠져나가도',
				'사흘째 굶어 헛것이 보여도',
				'바지가 흘러내려 붙잡고 뛰어도',
				'오줌을 지린 채로 계속 뛰어도',
				'다리가 후들려 기어서 도망쳐도'
			])
		},
		b: {
			name: '싸움',
			emoji: '⚔️',
			// 싸움을 고수할수록 나빠지는 방향. 도망과 대칭(둘 다 갈수록 궁지 → 팽팽). 뇌절 톤.
			penalties: pens([
				'휘두르다 어깨가 빠져도',
				'좀비 침이 얼굴에 튀어도',
				'손톱이 뒤집혀 까져도',
				'썩은 내에 헛구역질이 나도',
				'좀비 내장이 온몸에 튀어도',
				'무기 부러져 맨주먹으로 쳐도',
				'한 대 물려 근질근질해져도',
				'팔이 후들려 헛방만 날려도',
				'물린 자리가 거뭇하게 번져도'
			])
		}
	}
];

export function getDeck(id: string): Deck | undefined {
	return DECKS.find((d) => d.id === id);
}

/**
 * 덱의 실제 문체(§4 CLT). 덱별 `penaltyStyleOverride`가 있으면 그것,
 * 없으면 유형 기본값 `TYPE_CONFIG[type].penaltyStyle`. UI 레이아웃 분기(Phase 4)가 소비.
 */
export function penaltyStyleOf(deck: Deck): PenaltyStyle {
	return deck.penaltyStyleOverride ?? TYPE_CONFIG[deck.type].penaltyStyle;
}
