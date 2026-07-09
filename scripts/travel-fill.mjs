import sharp from 'sharp';
import { existsSync } from 'node:fs';

const SRC = '/mnt/c/Users/ksj/Pictures/making';
const OUT = '/home/jammy/projects/making/static/gen';

// [후보 라벨, 원본 파일명] — samples.ts 여행지 후보 순서와 index 정렬
const MAP = [
	['교토', '교토 (일본).jfif'],
	['도쿄', '도쿄 (일본).jfif'],
	['파리', '파리 (프랑스).jfif'],
	['방콕', '방콕 (태국).jfif'],
	['뉴욕', '뉴욕 (미국).webp'],
	['로마', '로마 (이탈리아).jfif'],
	['시드니', '시드니 (호주).jfif'],
	['그랜드캐년', '그랜드 캐년 (미국).jfif'],
	['리우데자네이루', '리우데자네이루 (브라질).jfif'],
	['마추픽추', '마추픽추 (페루).jfif'],
	['산토리니', '산토리니 (그리스).jfif'],
	['바르셀로나', '바르셀로나 (스페인).jfif'],
	['서울', '서울 (대한민국).jfif'],
	['두바이', '두바이 (아랍에미리트).jfif'],
	['이스탄불', '이스탄불 (터키).jfif'],
	['베네치아', '베네치아 (이탈리아).jfif'],
	['베이징', '베이징 (중국).jfif'],
	['카이로', '카이로 (이집트).jfif'],
	['아그라', '아그라 (인도).jfif'],
	['북극광', '북극광 (아이슬란드).jfif']
];

const images = [];
for (let i = 0; i < MAP.length; i++) {
	const [name, file] = MAP[i];
	const src = `${SRC}/${file}`;
	if (!existsSync(src)) {
		console.error('MISSING', name, file);
		images.push('');
		continue;
	}
	const idx = String(i).padStart(2, '0');
	const dst = `${OUT}/travel-destination-${idx}.webp`;
	await sharp(src)
		.resize(384, 384, { fit: 'cover' })
		.webp({ quality: 82 })
		.toFile(dst);
	images.push(`/gen/travel-destination-${idx}.webp`);
}

console.log('candidates:');
console.log(MAP.map(([n]) => `\t\t\t'${n}'`).join(',\n'));
console.log('\nimages:');
console.log(
	images
		.map((s, i) => `\t\t\t${s ? `'${s}'` : `''`}${i < images.length - 1 ? ',' : ''} // ${MAP[i][0]}`)
		.join('\n')
);
