import { describe, it, expect } from 'vitest';
import { DECKS, TYPE_CONFIG, getDeck, penaltyStyleOf, type Deck, type DeckType } from './decks';

const ALL_TYPES: DeckType[] = ['attribute', 'person', 'scenario', 'acquisition', 'value'];

describe('유형 태그 인프라 (Phase 0)', () => {
	it('모든 덱은 유효한 유형 태그를 가진다', () => {
		for (const deck of DECKS) {
			expect(ALL_TYPES).toContain(deck.type);
		}
	});

	it('현재 덱 유형: 여름=속성, 결혼=인물, 초능력=획득, 좀비=상황', () => {
		expect(DECKS.find((d) => d.id === 'summer-winter')?.type).toBe('attribute');
		expect(DECKS.find((d) => d.id === 'marriage')?.type).toBe('person');
		expect(DECKS.find((d) => d.id === 'superpower')?.type).toBe('acquisition');
		expect(DECKS.find((d) => d.id === 'zombie')?.type).toBe('scenario');
		expect(DECKS.find((d) => d.id === 'cursed-power')?.type).toBe('acquisition');
		expect(DECKS.find((d) => d.id === 'dirty-partner')?.type).toBe('person');
	});

	it('모든 덱은 사이드별 페널티 9장(강도 2~10)', () => {
		for (const deck of DECKS) {
			expect(deck.a.penalties).toHaveLength(9);
			expect(deck.b.penalties).toHaveLength(9);
			expect(deck.a.penalties.map((p) => p.strength)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
		}
	});

	it('획득형(초능력) 문체는 부작용형 ≤20자 (§5-3)', () => {
		const sp = DECKS.find((d) => d.id === 'superpower')!;
		for (const p of [...sp.a.penalties, ...sp.b.penalties]) {
			expect(p.text.length).toBeLessThanOrEqual(20);
		}
	});

	it('상황형(좀비) 문체는 행동 결과 ≤25자 (§5-3)', () => {
		const z = DECKS.find((d) => d.id === 'zombie')!;
		for (const p of [...z.a.penalties, ...z.b.penalties]) {
			expect(p.text.length).toBeLessThanOrEqual(25);
		}
	});

	it('TYPE_CONFIG에 5유형이 모두 존재하고 framing/penaltyStyle을 가진다', () => {
		for (const t of ALL_TYPES) {
			expect(TYPE_CONFIG[t]).toBeDefined();
			expect(TYPE_CONFIG[t].framing).toBeTruthy();
			expect(['short', 'long']).toContain(TYPE_CONFIG[t].penaltyStyle);
		}
	});

	it('인물형은 긴 에피소드(long), 속성형은 짧은 조건(short)', () => {
		expect(TYPE_CONFIG.person.penaltyStyle).toBe('long');
		expect(TYPE_CONFIG.attribute.penaltyStyle).toBe('short');
	});
});

describe('penaltyStyleOf 리졸버 (Phase 4)', () => {
	it('오버라이드 없으면 유형 기본값을 쓴다', () => {
		expect(penaltyStyleOf(getDeck('marriage')!)).toBe('long'); // person
		expect(penaltyStyleOf(getDeck('summer-winter')!)).toBe('short'); // attribute
		expect(penaltyStyleOf(getDeck('zombie')!)).toBe('short'); // scenario
	});

	it('덱별 penaltyStyleOverride가 유형 기본값을 덮어쓴다', () => {
		const base = getDeck('summer-winter')!; // 기본 short
		const overridden: Deck = { ...base, penaltyStyleOverride: 'long' };
		expect(penaltyStyleOf(overridden)).toBe('long');
	});
});
