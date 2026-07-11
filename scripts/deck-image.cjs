/**
 * 덱 이미지 전처리 → 압축 → Storage(deck-images) 업로드 → DB 덱에 반영. (덱은 DB 정본 — decksRepo)
 *
 * 두 모드:
 *   sides <deckId> <분할PNG>  좌|우 분할 이미지를 편별 정사각(512) 스마트크롭 → data.a.emoji/b.emoji
 *   icon  <deckId> <PNG>      한 장을 원본 비율 유지(최대 800px) 압축 → data.icon (대표 아이콘)
 * 둘 다 WebP(q80)로 압축한다.
 *
 * 사용법(프로젝트 루트에서):
 *   node scripts/deck-image.cjs icon  marriage ~/Downloads/marriage-cover.png
 *   node scripts/deck-image.cjs sides marriage ~/Downloads/얼굴천재개그천재.png
 *
 * 필요 env(.env에서 자동 로드): PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const BUCKET = 'deck-images';

function loadEnv() {
	const p = path.join(__dirname, '..', '.env');
	if (!fs.existsSync(p)) return;
	for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
	}
}

// 한쪽 반(a=좌, b=우)을 정사각 스마트크롭.
async function half(file, side) {
	const meta = await sharp(file).metadata();
	const halfW = Math.floor(meta.width / 2);
	const left = side === 'a' ? 0 : halfW;
	const width = side === 'a' ? halfW : meta.width - halfW;
	return sharp(file)
		.extract({ left, top: 0, width, height: meta.height })
		.resize({ width: 512, height: 512, fit: 'cover', position: 'attention' })
		.webp({ quality: 80 })
		.toBuffer();
}

// 전체 이미지: 원본 비율 유지, 최대 800px.
async function whole(file) {
	return sharp(file)
		.resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer();
}

async function main() {
	loadEnv();
	const [mode, deckId, srcFile] = process.argv.slice(2);
	if (!['sides', 'icon'].includes(mode) || !deckId || !srcFile) {
		console.error('사용법:');
		console.error('  node scripts/deck-image.cjs icon  <deckId> <PNG>       # 전체→대표 아이콘');
		console.error('  node scripts/deck-image.cjs sides <deckId> <분할PNG>   # 좌|우→양편 emoji');
		process.exit(1);
	}
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.error('env 없음: PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env 확인)');
		process.exit(1);
	}
	const sb = createClient(url, key, { auth: { persistSession: false } });

	const upload = async (buf) => {
		const name = `${randomUUID()}.webp`;
		const { error } = await sb.storage
			.from(BUCKET)
			.upload(name, buf, { contentType: 'image/webp', upsert: false });
		if (error) throw error;
		return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
	};

	const { data: row, error: selErr } = await sb
		.from('decks')
		.select('data')
		.eq('id', deckId)
		.single();
	if (selErr) throw new Error(`덱 조회 실패(${deckId}): ${selErr.message}`);
	const deck = row.data;

	if (mode === 'icon') {
		deck.icon = await upload(await whole(srcFile));
		console.log(`${deckId}: 대표 아이콘 설정 → ${deck.icon}`);
	} else {
		deck.a.emoji = await upload(await half(srcFile, 'a'));
		deck.b.emoji = await upload(await half(srcFile, 'b'));
		console.log(`${deckId}: 양편 이미지 설정`);
		console.log(`  a.emoji=${deck.a.emoji}`);
		console.log(`  b.emoji=${deck.b.emoji}`);
	}

	const { error: upErr } = await sb
		.from('decks')
		.update({ data: deck, updated_at: new Date().toISOString() })
		.eq('id', deckId);
	if (upErr) throw upErr;
	console.log('완료');
}

main().catch((e) => {
	console.error('ERR:', e.message);
	process.exit(1);
});
