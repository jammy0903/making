/**
 * 공유 미리보기(og) 공통 로직 — 결과 링크(?r=)·도전 링크(?vs=)에서 미리보기 문구/라벨을 만든다.
 * `+page.server.ts`(og 텍스트)와 `/og/[deck]`(og 이미지)이 같이 쓴다. 순수 함수 — 서버/엣지 무관.
 */
import {
	computeResult,
	decodeChoices,
	headlineTail,
	pickResultCard,
	roundsOf,
	type SideIndex
} from './engine';
import type { Deck } from './decks';

/** 공유 코드가 이 덱의 판 수와 맞는 완주 시퀀스일 때만 반환(아니면 null). */
export function validCode(deck: Deck, code: string | null): SideIndex[] | null {
	const c = decodeChoices(code);
	return c && c.length === roundsOf(deck) ? c : null;
}

/** 결과 유형 라벨(캐릭터 카드 우선, 없으면 헤드라인 폴백). 앞에 편 이모지가 붙을 수 있다. */
export function resultLabel(deck: Deck, choices: SideIndex[]): string {
	const result = computeResult(deck, choices);
	if (result.indecisive) return '🤷 어느 쪽도 못 버틴 결정장애 유형';
	if (result.adaptive) return '🔄 상황마다 최선을 갈아탄 적응형';
	const pref = result.pref === 0 ? deck.a : deck.b;
	const card = pickResultCard(deck, result);
	return card ? `${pref.emoji} ${card.label}` : `그래도 ${pref.emoji} ${pref.name} ${headlineTail(deck)}`;
}

export type ShareKind = 'result' | 'vs' | 'deck';

export interface OgText {
	kind: ShareKind;
	title: string;
	description: string;
}

/** URL 쿼리(?r=/?vs=)에 따른 미리보기 문구. 도전 > 결과 > 그냥 덱 순. */
export function ogText(deck: Deck, params: URLSearchParams): OgText {
	const versus = `${deck.a.name} vs ${deck.b.name}`;
	if (validCode(deck, params.get('vs'))) {
		return {
			kind: 'vs',
			title: `친구야, 너의 취향은? · ${deck.title}`,
			description: '나는 골랐어. 너도 골라봐 — 너는 뭐야?'
		};
	}
	const r = validCode(deck, params.get('r'));
	if (r) {
		return {
			kind: 'result',
			title: resultLabel(deck, r),
			description: `나는 이렇게 나왔어. 친구야, 너의 취향은?`
		};
	}
	return {
		kind: 'deck',
		title: deck.title,
		description: `${versus} — 너의 취향은?`
	};
}
