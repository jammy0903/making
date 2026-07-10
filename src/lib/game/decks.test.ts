import { describe, it, expect } from 'vitest';
import { DECKS, TYPE_CONFIG, type DeckType } from './decks';

const ALL_TYPES: DeckType[] = ['attribute', 'person', 'scenario', 'acquisition', 'value'];

describe('유형 태그 인프라 (Phase 0)', () => {
	it('모든 덱은 유효한 유형 태그를 가진다', () => {
		for (const deck of DECKS) {
			expect(ALL_TYPES).toContain(deck.type);
		}
	});

	it('현재 2덱은 각각 속성형·인물형', () => {
		expect(DECKS.find((d) => d.id === 'summer-winter')?.type).toBe('attribute');
		expect(DECKS.find((d) => d.id === 'marriage')?.type).toBe('person');
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
