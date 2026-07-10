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
				'선풍기 1대뿐임',
				'매일 열대야임',
				'에어컨 없음',
				'모기장도 없음',
				'하루종일 땀범벅임',
				'온몸에 땀띠 남',
				'습도 90% 찜통임',
				'사계절 내내 40도임',
				'평생 여름만임'
			])
		},
		b: {
			name: '겨울',
			emoji: '❄️',
			// 겨울의 본질을 강도순으로 극대화. 여름과 대칭.
			penalties: pens([
				'외투 1개뿐임',
				'매일 손발 시림',
				'히터 없음',
				'이불 밖은 금지임',
				'손 트고 입술 갈라짐',
				'매일 빙판길임',
				'손발 다 동상 걸림',
				'사계절 내내 영하 20도임',
				'평생 겨울만임'
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
				'코골이에 이갈이 풀세트임',
				'거울 앞을 못 지나쳐 매번 1시간 늦음',
				'데이트마다 셀카 200장 찍느라 넌 뒷전임',
				'분위기 잡다 배 아프다며 매번 뛰쳐나감',
				'화장실 문 안 닫고 큰일 보며 말 시킴',
				'월급 전부 피부과·옷에 쓰고 생활비는 네가 다 냄',
				'전 애인 20명이 아직 연락 오고 답장도 함',
				'시어머니가 열쇠 들고 예고 없이 들이닥침',
				'평생 잘생겼지만 철은 안 듦'
			])
		},
		b: {
			name: '개그천재',
			emoji: '😆',
			penalties: pens([
				'같이 찍은 사진마다 너만 잘 나옴',
				'진지한 얘기마다 5초에 한 번 드립침',
				'중요한 순간마다 방귀로 분위기 깸',
				'프러포즈도 개그로 해서 감동이 0임',
				'친구들이 "왜 하필 쟤?"를 매번 물어봄',
				'집에선 안 웃기고 밖에서만 인싸임',
				'예능 스케줄로 신혼집을 자주 비움',
				'장모님 앞에서까지 드립치다 미움받음',
				'평생 안 잘생김'
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
				'속도가 딱 걷는 만큼임',
				'지붕 높이까지만 뜸',
				'방향은 바람 부는 대로임',
				'착지마다 엉덩방아 찧음',
				'비둘기 떼가 늘 따라붙음',
				'5분 넘으면 멀미로 토함',
				'뜰 때마다 신발이 벗겨짐',
				'잘 때도 붕 떠서 이불이 흘러내림',
				'한번 뜨면 하루종일 못 내려옴'
			])
		},
		b: {
			name: '순간이동',
			emoji: '🌀',
			// 짧은 거리·저정밀 순간이동의 부작용. 비행과 대칭(둘 다 이동 능력이라 팽팽).
			penalties: pens([
				'딱 10m씩만 이동됨',
				'도착하면 늘 뒤돌아 서 있음',
				'입은 옷은 안 따라옴',
				'이동 후 5초간 어지러움',
				'가끔 벽에 반쯤 박혀 나옴',
				'하루 딱 3번만 씀',
				'쓸 때마다 속 뒤집혀 토함',
				'목적지가 몇 미터씩 어긋남',
				'한번 쓰면 하루종일 손이 떨림'
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
				'신발 한 짝만 신고 뜀',
				'뛰다 방귀가 계속 샘',
				'똥이 마려운데 참고 뜀',
				'코피가 멈추질 않고 흐름',
				'발톱이 하나씩 빠져나감',
				'사흘째 굶어 헛것이 보임',
				'바지가 흘러내려 붙잡고 뜀',
				'오줌을 지린 채로 계속 뜀',
				'다리가 후들려 기어서 도망침'
			])
		},
		b: {
			name: '싸움',
			emoji: '⚔️',
			// 싸움을 고수할수록 나빠지는 방향. 도망과 대칭(둘 다 갈수록 궁지 → 팽팽). 뇌절 톤.
			penalties: pens([
				'휘두르다 어깨가 빠짐',
				'좀비 침이 얼굴에 튐',
				'손톱이 뒤집혀 까짐',
				'썩은 내에 헛구역질 남',
				'좀비 내장이 온몸에 튐',
				'무기 부러져 맨주먹으로 침',
				'한 대 물려 근질근질해짐',
				'팔이 후들려 헛방만 날림',
				'물린 자리가 거뭇하게 번짐'
			])
		}
	},
	{
		id: 'cursed-power',
		title: '저주받은 초능력: 순간이동 vs 투명인간',
		icon: '🩹',
		type: 'acquisition',
		a: {
			name: '순간이동',
			emoji: '✨',
			// 획득형 부작용형(§2 유형4·§5-2 동시 성립): 순간이동은 되는데 굴욕적 대가.
			// 10장이 한 세계로 성립 — 알몸으로, 소지품 없이, 하루 몇 번, 겹침 위험까지.
			penalties: pens([
				'도착할 때마다 알몸임',
				'착지 지점이 1m씩 빗나감',
				'이동할 때마다 5초 기절함',
				'갈 때마다 극심한 두통 옴',
				'도착하면 먹은 걸 다 게워냄',
				'소지품은 하나도 안 따라옴',
				'하루 딱 세 번만 씀',
				'도착지 벽·물건과 살짝 겹침',
				'쓴 날 밤엔 꼭 가위눌림'
			])
		},
		b: {
			name: '투명인간',
			emoji: '👻',
			// 투명해지는데 굴욕적 대가. 순간이동과 대칭(둘 다 알몸·제약으로 팽팽).
			penalties: pens([
				'투명해질 때 옷은 안 따라옴',
				'눈까지 투명해져 앞이 안 보임',
				'냄새는 그대로 다 풍김',
				'배 속 음식이 둥둥 떠 보임',
				'재채기 한 번에 다 들통남',
				'풀리면 3분간 온몸이 저림',
				'한번 쓰면 한 시간 못 풂',
				'그림자는 그대로 남아 있음',
				'풀 때마다 알몸으로 나타남'
			])
		}
	},
	{
		id: 'dirty-partner',
		title: '평생 함께라면? 털털이 vs 결벽러',
		icon: '🧼',
		type: 'person',
		a: {
			name: '털털이',
			emoji: '💨',
			// 인물형 긴 에피소드(§4 long): 더러움 방향으로 escalating. 결벽러와 대칭(둘 다 극단→팽팽).
			penalties: pens([
				'방귀를 수시로 소리 내며 뀜',
				'트림할 때 냄새까지 얼굴에 뿜음',
				'양말을 사흘씩 신고 아무 데나 벗어놓음',
				'코를 판 그 손으로 리모컨을 만짐',
				'화장실 문 열고 볼일 보며 말 시킴',
				'발가락 때를 소파에서 파며 티비 봄',
				'씻자고 하면 "귀찮아" 하고 그냥 잠',
				'내 칫솔로 아무렇지 않게 양치함',
				'평생 안 씻는데 본인은 늘 태평함'
			])
		},
		b: {
			name: '결벽러',
			emoji: '🧴',
			// 강박 방향으로 escalating. 더러움의 정반대 극단.
			penalties: pens([
				'집에 오면 무조건 30분 샤워부터 시킴',
				'소파에 앉기 전 물티슈로 다 닦게 함',
				'외출복으로 침대에 앉으면 잔소리 폭발함',
				'손 씻는 걸 하루 스무 번씩 검사함',
				'내 물건이 1cm만 어긋나도 참견함',
				'친구가 다녀가면 온 집을 소독함',
				'신발을 현관에서 알코올로 닦게 함',
				'재채기 한 번에 온 방을 청소하게 함',
				'평생 함께 청소만 하다 하루가 다 감'
			])
		}
	},
	{
		id: 'gross-food',
		title: '평생 이것만: 똥맛 카레 vs 카레맛 똥',
		icon: '🍛',
		type: 'attribute',
		a: {
			name: '똥맛 카레',
			emoji: '💩',
			// 속성형 병맛(§idea-bank). 진짜 카레인데 그 맛. 역겨움보다 사회적 부조리로 escalating.
			penalties: pens([
				'냄새도 딱 그 냄새임',
				'남들 앞에서도 이것만 먹음',
				'첫 데이트 메뉴도 이거임',
				'평생 다른 맛은 못 느낌',
				'먹을 때마다 헛구역질 남',
				'매 끼니 세 그릇씩 비움',
				'결혼식 답례품도 이거임',
				'죽기 전 마지막 식사도 이거임',
				'평생 하루 세 끼 이것만임'
			])
		},
		b: {
			name: '카레맛 똥',
			emoji: '🍛',
			// 맛은 카레인데 정체는 그대로. 똥맛 카레와 대칭.
			penalties: pens([
				'맛만 카레지 정체는 그대로임',
				'갓 나온 따끈한 걸 먹음',
				'남들 앞에서 포크로 떠먹음',
				'향은 카레라 자꾸 배고파짐',
				'냄새로는 절대 구분 못 함',
				'매 끼니 한 접시씩 비움',
				'평생 진짜 카레는 못 먹음',
				'남이 준 것도 받아먹어야 함',
				'평생 하루 세 끼 이것만임'
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
