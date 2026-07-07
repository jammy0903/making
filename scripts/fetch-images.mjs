/**
 * Bing 이미지 검색으로 후보 이미지를 받아 webp(384px)로 저장 (독립 실행, 네트워크 필요).
 *
 * 사용: node scripts/fetch-images.mjs <queries.json>
 *   queries.json = [{ "file": "street-00", "query": "붕어빵" }, ...]
 *
 * ⚠️ Bing 결과는 저작권 있는 웹 이미지 — 개인용(월드컵) 범위로만.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const OUT_DIR = 'static/gen';
const MAX_SIDE = 384;
const WEBP_QUALITY = 78;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bing 이미지 검색 HTML 파싱 → 원본 URL 목록
async function searchImages(query, count = 12) {
	const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
	const res = await fetch(url, {
		headers: { 'User-Agent': UA, Cookie: 'ADLT=DEMOTE' },
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);
	const html = await res.text();
	const urls = [];
	const seen = new Set();
	for (const m of html.matchAll(/m="(\{[^"]+?\})"/g)) {
		let tile;
		try {
			tile = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
		} catch {
			continue;
		}
		if (!tile.murl || !/^https?:\/\//.test(tile.murl) || seen.has(tile.murl)) continue;
		seen.add(tile.murl);
		urls.push(tile.murl);
		if (urls.length >= count) break;
	}
	return urls;
}

// 원본 URL 다운로드 → sharp 로 유효성 검사 + webp 변환. 실패하면 다음 후보로.
async function downloadAsWebp(urls) {
	for (const u of urls) {
		try {
			const res = await fetch(u, {
				headers: { 'User-Agent': UA, Referer: 'https://www.bing.com/' },
				signal: AbortSignal.timeout(15000)
			});
			if (!res.ok) continue;
			const ct = res.headers.get('content-type') || '';
			if (!ct.startsWith('image/')) continue;
			const buf = Buffer.from(await res.arrayBuffer());
			const out = await sharp(buf)
				.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
				.webp({ quality: WEBP_QUALITY })
				.toBuffer();
			return { out, src: u };
		} catch {
			// 다음 후보 시도
		}
	}
	return null;
}

const queriesPath = process.argv[2];
if (!queriesPath) {
	console.error('사용법: node scripts/fetch-images.mjs <queries.json>');
	process.exit(1);
}
const items = JSON.parse(readFileSync(queriesPath, 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

let ok = 0;
for (const it of items) {
	try {
		const urls = await searchImages(it.query);
		const got = await downloadAsWebp(urls);
		if (!got) {
			console.log(`FAIL ${it.file}: 다운로드 가능한 이미지 없음 (query: ${it.query})`);
			continue;
		}
		writeFileSync(`${OUT_DIR}/${it.file}.webp`, got.out);
		ok++;
		console.log(`OK  ${it.file}.webp  (${Math.round(got.out.length / 1024)}KB)  ← ${it.query}`);
		await sleep(800); // 레이트리밋 완화
	} catch (err) {
		console.log(`FAIL ${it.file}: ${err.message}`);
	}
}
console.log(`\n완료: ${ok}/${items.length}장`);
