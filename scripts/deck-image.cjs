/**
 * 덱 분할 이미지(좌=A편 | 우=B편) 전처리 → 압축 → Storage 업로드 → 덱 양편 emoji에 URL 설정.
 *
 * 좌우로 쪼개 각 편을 정사각(512) 스마트크롭 + WebP(q80)로 압축한 뒤 공개 버킷 deck-images에
 * 올리고, 해당 덱(data.a.emoji / data.b.emoji)에 공개 URL을 박는다. (덱은 DB 정본 — decksRepo)
 *
 * 사용법(프로젝트 루트에서):
 *   node scripts/deck-image.cjs <deckId> <분할PNG경로>
 * 예:
 *   node scripts/deck-image.cjs marriage ~/Downloads/얼굴천재개그천재.png
 *
 * 필요 env(.env에서 자동 로드): PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * 대표 아이콘(data.icon)은 건드리지 않는다 — 필요하면 admin 편집기에서 따로 지정.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const BUCKET = 'deck-images';

// .env 최소 파서(KEY=VALUE, 따옴표/주석 무시).
function loadEnv() {
	const p = path.join(__dirname, '..', '.env');
	if (!fs.existsSync(p)) return;
	for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
	}
}

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

async function main() {
	loadEnv();
	const [deckId, srcFile] = process.argv.slice(2);
	if (!deckId || !srcFile) {
		console.error('사용법: node scripts/deck-image.cjs <deckId> <분할PNG경로>');
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

	const aUrl = await upload(await half(srcFile, 'a'));
	const bUrl = await upload(await half(srcFile, 'b'));

	const { data: row, error: selErr } = await sb
		.from('decks')
		.select('data')
		.eq('id', deckId)
		.single();
	if (selErr) throw new Error(`덱 조회 실패(${deckId}): ${selErr.message}`);
	const deck = row.data;
	deck.a.emoji = aUrl;
	deck.b.emoji = bUrl;
	const { error: upErr } = await sb
		.from('decks')
		.update({ data: deck, updated_at: new Date().toISOString() })
		.eq('id', deckId);
	if (upErr) throw upErr;

	console.log(`${deckId}: 양편 이미지 설정 완료`);
	console.log(`  a.emoji = ${aUrl}`);
	console.log(`  b.emoji = ${bUrl}`);
}

main().catch((e) => {
	console.error('ERR:', e.message);
	process.exit(1);
});
