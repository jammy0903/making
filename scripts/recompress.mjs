/**
 * 기존 static/gen/*.jpeg 를 webp(384px)로 재압축하고 원본 jpeg 는 삭제.
 * 일회성: 이미 생성해 둔 이미지들의 용량을 줄인다.
 *
 * 사용: node scripts/recompress.mjs
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import sharp from 'sharp';

const DIR = 'static/gen';
const MAX_SIDE = 384;
const WEBP_QUALITY = 78;

const files = readdirSync(DIR).filter((f) => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
let before = 0;
let after = 0;

for (const f of files) {
	const src = `${DIR}/${f}`;
	const beforeSize = statSync(src).size;
	const out = await sharp(readFileSync(src))
		.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();
	const dst = src.replace(/\.(jpe?g|png)$/, '.webp');
	writeFileSync(dst, out);
	if (dst !== src) unlinkSync(src); // 원본 제거
	before += beforeSize;
	after += out.length;
	console.log(`${f} → ${dst.split('/').pop()}  ${Math.round(beforeSize / 1024)}KB → ${Math.round(out.length / 1024)}KB`);
}

console.log(
	`\n총 ${files.length}장: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`
);
