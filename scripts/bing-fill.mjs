/**
 * samples.ts 에서 "이미지 없는 비인물 주제"를 찾아 Bing 이미지로 자동 채운다.
 * 각 후보를 Bing 검색→다운로드→webp(384px) 저장하고, samples.ts 에 images 배열을 써 넣는다.
 * 인물/캐릭터/MBTI 주제는 건너뛴다. 이미 images 가 있는 주제도 건너뛴다(재개 가능).
 *
 * 사용: node scripts/bing-fill.mjs   (네트워크 필요)
 * ⚠️ Bing 결과는 저작권 있는 웹 이미지 — 개인용(월드컵) 범위로만.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SAMPLES = 'src/lib/samples.ts';
const OUT_DIR = 'static/gen';
const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const MAX_SIDE = 384;
const WEBP_QUALITY = 78;
const SKIP = /아이돌|배우|캐릭터|MBTI/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Bing 검색 + 다운로드 ──
// 각 결과에서 원본(murl)과 Bing 호스팅 썸네일(turl)을 함께 뽑는다.
// turl 은 Bing CDN 이라 403 없이 항상 받을 수 있고, 상위 결과라 관련성도 높다.
async function searchImages(query, count = 25) {
	const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
	const res = await fetch(url, {
		headers: { 'User-Agent': UA, Cookie: 'ADLT=DEMOTE' },
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);
	const html = await res.text();
	const results = [];
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
		results.push({ murl: tile.murl, turl: tile.turl, title: tile.t || '' });
		if (results.length >= count) break;
	}
	return results;
}

async function fetchImage(u) {
	const res = await fetch(u, {
		headers: { 'User-Agent': UA, Referer: 'https://www.bing.com/' },
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) return null;
	if (!(res.headers.get('content-type') || '').startsWith('image/')) return null;
	return Buffer.from(await res.arrayBuffer());
}

// 정확성 우선: 결과 "제목"에 검색어가 포함된 것만 채택(무관한 이미지 방지).
// 매칭되는 게 없으면 null(빈칸). Bing 이 간헐적으로 무관한 타일을 주기 때문.
async function downloadAsWebp(results, matchKey) {
	const key = matchKey.replace(/\s/g, '');
	const relevant = results.filter((r) => r.title.replace(/\s/g, '').includes(key));
	for (const r of relevant) {
		for (const u of [r.turl, r.murl]) {
			if (!u || !/^https?:\/\//.test(u)) continue;
			try {
				const buf = await fetchImage(u);
				if (!buf) continue;
				return await sharp(buf)
					.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
					.webp({ quality: WEBP_QUALITY })
					.toBuffer();
			} catch {
				// 다음 후보
			}
		}
	}
	return null;
}

// ── samples.ts 파싱 (title + candidates + images 유무) ──
function parseTopics(src) {
	const topics = [];
	const re = /title: '([^']+)'/g;
	const marks = [];
	let m;
	while ((m = re.exec(src))) marks.push({ title: m[1], idx: m.index });
	for (let i = 0; i < marks.length; i++) {
		const seg = src.slice(marks[i].idx, i + 1 < marks.length ? marks[i + 1].idx : src.length);
		const cm = seg.match(/candidates: \[([\s\S]*?)\]/);
		if (!cm) continue;
		const names = (cm[1].match(/'([^']*)'/g) || []).map((s) => s.slice(1, -1));
		topics.push({
			index: i,
			title: marks[i].title,
			candidates: names,
			candidatesBlock: `candidates: [${cm[1]}]`,
			hasImages: /images: \[/.test(seg)
		});
	}
	return topics;
}

// ── 검색어 다듬기 ──
const SEASON = { 봄: '봄 벚꽃 풍경', 여름: '여름 바다 해변', 가을: '가을 단풍 풍경', 겨울: '겨울 눈 풍경' };
function queryFor(title, name) {
	if (SEASON[name] && title.includes('계절')) return SEASON[name];
	if (title.includes('여행지')) return `${name} 여행 랜드마크`;
	if (title.includes('반려동물') || title.includes('새끼동물')) return `${name} 동물`;
	return name; // 음식/음료/브랜드 등은 이름이 곧 좋은 검색어
}

// ── 실행 ──
mkdirSync(OUT_DIR, { recursive: true });
const MODE = process.argv[2]; // 'people' → 인물(아이돌/배우)만 채움
const PERSON = /아이돌|배우/;
const initial = parseTopics(readFileSync(SAMPLES, 'utf8'));
const todo = initial.filter((t) => {
	if (t.hasImages) return false;
	if (MODE === 'people') return PERSON.test(t.title); // 인물 전용
	return !SKIP.test(t.title); // 기본: 비인물
});
console.log(
	`대상 주제: ${todo.length}개 (${MODE === 'people' ? '인물(아이돌/배우) 전용' : '비인물, 인물/캐릭터/MBTI 제외'})\n`
);

for (const t of todo) {
	// 재개: 지금 파일 기준으로 이미 images 있으면 skip
	const fresh = parseTopics(readFileSync(SAMPLES, 'utf8')).find((x) => x.title === t.title);
	if (!fresh || fresh.hasImages) {
		console.log(`SKIP ${t.title} (이미 처리됨)`);
		continue;
	}
	console.log(`▶ ${t.title} (${t.candidates.length}장)`);
	const urls = [];
	let ok = 0;
	for (let i = 0; i < t.candidates.length; i++) {
		const name = t.candidates[i];
		const file = `fill${t.index}-${String(i).padStart(2, '0')}`;
		try {
			const found = await searchImages(queryFor(t.title, name));
			const webp = await downloadAsWebp(found, name);
			if (webp) {
				writeFileSync(`${OUT_DIR}/${file}.webp`, webp);
				urls.push(`/gen/${file}.webp`);
				ok++;
			} else {
				urls.push(''); // 실패 자리(빈 문자열 → 이름 앞글자 표시)
				console.log(`   FAIL ${name}`);
			}
		} catch (e) {
			urls.push('');
			console.log(`   FAIL ${name}: ${e.message}`);
		}
		await sleep(600);
	}
	// samples.ts 에 images 배열 써 넣기
	const src = readFileSync(SAMPLES, 'utf8');
	const imagesLiteral = `,\n\t\timages: [\n\t\t\t${urls.map((u) => `'${u}'`).join(',\n\t\t\t')}\n\t\t]`;
	const replaced = src.replace(fresh.candidatesBlock, fresh.candidatesBlock + imagesLiteral);
	if (replaced === src) {
		console.log(`   ⚠ samples.ts 치환 실패(블록 불일치): ${t.title}`);
	} else {
		writeFileSync(SAMPLES, replaced);
		console.log(`   ✔ ${ok}/${t.candidates.length}장 연결`);
	}
}
console.log('\n전체 완료.');
