/**
 * Bing 이미지 검색 (서버 전용, API 키 불필요).
 *
 * Bing 이미지 검색 결과 페이지(HTML)를 받아 각 타일의 m="{...}" JSON 을 파싱한다.
 * 웹 전체 이미지를 찾아 원본 URL 을 돌려주므로 Google 이미지 검색과 유사하게 쓸 수 있다.
 *
 * ⚠️ 비공식 스크래핑: Bing 이 마크업을 바꾸면 파싱이 깨질 수 있고, 과도하게 호출하면
 *    레이트리밋에 걸릴 수 있다. 결과 이미지는 저작권이 있으니 개인용(월드컵) 범위로만 사용.
 */
import { BROWSER_UA } from './http';

export interface ImageSearchOptions {
	/** 가져올 최대 개수 (기본 20) */
	count?: number;
	/** 세이프서치 (기본 'moderate') */
	safe?: 'off' | 'moderate' | 'strict';
}

export interface ImageResult {
	title: string;
	/** 원본 이미지 URL */
	url: string;
	/** 썸네일 URL (Bing 호스팅, 목록 표시용) */
	thumbnail: string;
	width?: number;
	height?: number;
	/** 이미지가 실린 페이지 URL (출처) */
	source: string;
}

interface BingTile {
	murl?: string;
	turl?: string;
	purl?: string;
	t?: string;
}

const SAFE_COOKIE: Record<NonNullable<ImageSearchOptions['safe']>, string> = {
	off: 'ADLT=OFF',
	moderate: 'ADLT=DEMOTE',
	strict: 'ADLT=STRICT'
};

/**
 * 검색어로 이미지를 찾아 결과 배열을 돌려준다.
 * 각 결과는 원본 URL + 썸네일 + 출처를 포함하므로, 사용자가 고른 뒤 후보 image 로 넣으면 된다.
 */
export async function searchImages(
	query: string,
	opts: ImageSearchOptions = {}
): Promise<ImageResult[]> {
	const count = opts.count ?? 20;
	const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;

	const res = await fetch(url, {
		headers: { 'User-Agent': BROWSER_UA, Cookie: SAFE_COOKIE[opts.safe ?? 'moderate'] },
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) throw new Error(`Bing 이미지 검색 오류: HTTP ${res.status}`);
	const html = await res.text();

	// 각 이미지 타일의 m="{...}" 속성(HTML 이스케이프된 JSON)을 뽑는다.
	const results: ImageResult[] = [];
	const seen = new Set<string>();
	for (const match of html.matchAll(/m="(\{[^"]+?\})"/g)) {
		let tile: BingTile;
		try {
			tile = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
		} catch {
			continue; // 깨진 타일은 건너뛴다
		}
		if (!tile.murl || !/^https?:\/\//.test(tile.murl) || seen.has(tile.murl)) continue;
		seen.add(tile.murl);
		results.push({
			title: tile.t ?? '',
			url: tile.murl,
			thumbnail: tile.turl || tile.murl,
			source: tile.purl ?? tile.murl
		});
		if (results.length >= count) break;
	}

	if (results.length === 0) {
		throw new Error('Bing 이미지 결과를 파싱하지 못했습니다 (마크업 변경 또는 차단 가능).');
	}
	return results;
}
