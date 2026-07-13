/**
 * 결과별 OG 이미지(레버 ②) — 공유 링크 미리보기 썸네일(1200×630 PNG)을 서버에서 렌더한다.
 * 카톡·인스타·X 스크래퍼는 og:image로 이 엔드포인트를 읽는다. SVG는 대부분 미지원이라 PNG 필수.
 *
 * 파이프라인: satori(HTML→SVG) → resvg(SVG→PNG). 브랜드 픽셀폰트(Galmuri, ttf)를 static에서 가져와 캐시.
 * satori는 이모지를 폰트로 못 그리므로(픽셀폰트에 이모지 없음) 표시 텍스트에선 이모지를 제거하고
 * 레이아웃/색으로 브랜딩한다. 결과·도전·그냥덱 3분기 공용.
 */
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { loadDeck } from '$lib/server/decksRepo';
import { ogText } from '$lib/game/share';
import type { RequestHandler } from './$types';

const W = 1200;
const H = 630;

// 브랜드 색(app.css 라이트 테마).
const C = {
	bg: '#e7e5f6',
	surface: '#ffffff',
	ink: '#211f3d',
	muted: '#6a6890',
	line: '#43406a',
	accent: '#6d5efc',
	accentInk: '#ffffff'
};

// 폰트는 static에서 1회 가져와 모듈 스코프 캐시(콜드스타트 후 재사용).
let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
async function loadFonts(origin: string) {
	if (fontCache) return fontCache;
	const [regular, bold] = await Promise.all([
		fetch(`${origin}/fonts/Galmuri11.ttf`).then((r) => r.arrayBuffer()),
		fetch(`${origin}/fonts/Galmuri11-Bold.ttf`).then((r) => r.arrayBuffer())
	]);
	fontCache = { regular, bold };
	return fontCache;
}

/** 이모지·변형선택자 제거(픽셀폰트로 못 그림). 남는 공백 정리. */
function stripEmoji(s: string): string {
	return s
		.replace(/\p{Extended_Pictographic}/gu, '')
		.replace(/[︎️‍]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** HTML 특수문자 이스케이프(라벨이 마크업에 안전하게 들어가게). */
function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: RequestHandler = async ({ params, url }) => {
	const deck = await loadDeck(params.deck ?? '');
	// 덱 없으면 기본 이미지로(깨진 미리보기 방지).
	if (!deck) return new Response(null, { status: 302, headers: { location: '/og-default.png' } });

	const { kind, title } = ogText(deck, url.searchParams);
	// 분기별 대·소 문구(이모지 제거).
	let badge: string;
	let headline: string;
	let sub: string;
	if (kind === 'result') {
		badge = '내 결과';
		headline = stripEmoji(title);
		sub = deck.title;
	} else if (kind === 'vs') {
		badge = '도전장';
		headline = deck.title;
		sub = '나랑 붙어볼래?';
	} else {
		badge = '밸런스게임';
		headline = deck.title;
		sub = `${deck.a.name} vs ${deck.b.name} — 너는 어디까지 버틸래?`;
	}

	const markup = html(`
		<div style="display:flex;width:${W}px;height:${H}px;padding:44px;background:${C.bg};font-family:Galmuri;">
			<div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;background:${C.surface};border:8px solid ${C.line};padding:56px 60px;">
				<div style="display:flex;align-items:center;justify-content:space-between;">
					<div style="display:flex;font-size:30px;font-weight:700;color:${C.accent};letter-spacing:-1px;">그런데이제</div>
					<div style="display:flex;font-size:26px;font-weight:700;color:${C.accentInk};background:${C.accent};padding:8px 20px;">${esc(badge)}</div>
				</div>
				<div style="display:flex;font-size:76px;font-weight:700;color:${C.ink};line-height:1.25;letter-spacing:-2px;">${esc(headline)}</div>
				<div style="display:flex;align-items:center;">
					<div style="display:flex;width:14px;height:44px;background:${C.accent};margin-right:20px;"></div>
					<div style="display:flex;font-size:34px;color:${C.muted};">${esc(sub)}</div>
				</div>
			</div>
		</div>
	`);

	const { regular, bold } = await loadFonts(url.origin);
	const svg = await satori(markup, {
		width: W,
		height: H,
		fonts: [
			{ name: 'Galmuri', data: regular, weight: 400, style: 'normal' },
			{ name: 'Galmuri', data: bold, weight: 700, style: 'normal' }
		]
	});

	const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			// 결과별 결정론 이미지 → 길게 캐시(엣지·브라우저·스크래퍼).
			'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
		}
	});
};
