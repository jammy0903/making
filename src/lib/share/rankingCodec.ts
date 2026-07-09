/**
 * 완료 순위 π 를 무상태 URL 조각으로 인코딩/디코딩(설계서 §7.5).
 *
 * 순위 = 주제 후보 배열의 인덱스 순열(1위→꼴찌). 후보는 최대 256강(설계서 §4)이라
 * 인덱스 0..255 가 정확히 1바이트에 들어간다 → 바이트열을 base64url(패딩 없음)로.
 * 16후보면 16바이트 ≈ 22자. DB 행·TTL 0, 영구·바이럴 안전.
 *
 * 인덱스 기반이라 주제 후보 목록이 재정렬/증감하면 옛 링크가 깨질 수 있다(길이·순열
 * 검증에서 null 반환으로 안전하게 실패). 통계용 안정 참조는 후보 id(§4.1)가 담당하고,
 * 이 코덱은 공유 링크의 컴팩트함을 위해 인덱스를 쓴다.
 */

const MAX_CANDIDATES = 256; // 인덱스 0..255 → 1바이트(설계서 §4 256강 제한과 정합)

function bytesToBase64url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s: string): Uint8Array {
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/**
 * 순위 인덱스 배열(1위→꼴찌)을 base64url 문자열로. 각 원소는 0..255 정수.
 * 범위 밖 값은 던진다(호출부 버그를 조용히 삼키지 않음).
 */
export function encodeRanking(rankingIndices: readonly number[]): string {
	const bytes = new Uint8Array(rankingIndices.length);
	for (let i = 0; i < rankingIndices.length; i++) {
		const idx = rankingIndices[i];
		if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_CANDIDATES) {
			throw new RangeError(`후보 인덱스 범위 밖(0..${MAX_CANDIDATES - 1}): ${idx}`);
		}
		bytes[i] = idx;
	}
	return bytesToBase64url(bytes);
}

/**
 * base64url 문자열을 순위 인덱스 배열로 디코딩. 다음 중 하나면 null(깨진/변조 링크):
 *  - base64 파싱 실패
 *  - 길이 ≠ candidateCount(주제 후보 수 변경 등)
 *  - 0..candidateCount−1 의 완전 순열이 아님(중복·범위 밖)
 */
export function decodeRanking(encoded: string, candidateCount: number): number[] | null {
	let bytes: Uint8Array;
	try {
		bytes = base64urlToBytes(encoded);
	} catch {
		return null;
	}
	if (bytes.length !== candidateCount) return null;

	const indices = Array.from(bytes);
	const seen = new Array<boolean>(candidateCount).fill(false);
	for (const idx of indices) {
		if (idx >= candidateCount || seen[idx]) return null; // 범위 밖·중복 → 순열 아님
		seen[idx] = true;
	}
	return indices;
}
