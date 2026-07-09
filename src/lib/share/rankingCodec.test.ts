import { describe, it, expect } from 'vitest';
import { encodeRanking, decodeRanking } from './rankingCodec';

describe('rankingCodec', () => {
	it('왕복(encode→decode)이 원본 순위를 복원', () => {
		const ranking = [3, 0, 1, 2];
		const enc = decodeRanking(encodeRanking(ranking), ranking.length);
		expect(enc).toEqual(ranking);
	});

	it('base64url 안전 문자만 사용(+ / = 없음)', () => {
		// 다양한 바이트가 나오도록 큰 순열
		const ranking = Array.from({ length: 40 }, (_, i) => (i * 7 + 3) % 40);
		const s = encodeRanking(ranking);
		expect(s).not.toMatch(/[+/=]/);
		expect(decodeRanking(s, 40)).toEqual(ranking);
	});

	it('16후보 ≈ 22자(설계서 §7.5)', () => {
		const ranking = Array.from({ length: 16 }, (_, i) => 15 - i);
		const s = encodeRanking(ranking);
		expect(s.length).toBe(22);
	});

	it('256강 경계(인덱스 255)까지 인코딩', () => {
		const ranking = Array.from({ length: 256 }, (_, i) => 255 - i);
		expect(decodeRanking(encodeRanking(ranking), 256)).toEqual(ranking);
	});

	it('범위 밖 인덱스는 던짐(256 이상·음수·비정수)', () => {
		expect(() => encodeRanking([256])).toThrow(RangeError);
		expect(() => encodeRanking([-1])).toThrow(RangeError);
		expect(() => encodeRanking([1.5])).toThrow(RangeError);
	});

	it('길이 불일치는 null(주제 후보 수 변경)', () => {
		const s = encodeRanking([0, 1, 2]);
		expect(decodeRanking(s, 4)).toBeNull();
		expect(decodeRanking(s, 2)).toBeNull();
	});

	it('중복 인덱스는 null(순열 아님)', () => {
		// [0,0,1] → 바이트 그대로 인코딩되지만 디코드 시 순열 검증에서 거부
		const s = encodeRanking([0, 0, 1]);
		expect(decodeRanking(s, 3)).toBeNull();
	});

	it('범위 밖 인덱스가 담긴 링크는 null', () => {
		const s = encodeRanking([0, 1, 5]); // candidateCount=3 기준 5는 범위 밖
		expect(decodeRanking(s, 3)).toBeNull();
	});

	it('깨진 base64 문자열은 null', () => {
		expect(decodeRanking('!!!not base64!!!', 4)).toBeNull();
	});

	it('빈 순위 왕복', () => {
		expect(decodeRanking(encodeRanking([]), 0)).toEqual([]);
	});
});
