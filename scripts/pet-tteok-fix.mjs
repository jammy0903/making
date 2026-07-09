import sharp from 'sharp';
import { existsSync } from 'node:fs';

const SRC = '/mnt/c/Users/ksj/Pictures/making';
const OUT = '/home/jammy/projects/making/static/gen';

// [출력파일, 원본파일] — samples.ts 인덱스에 정렬
const MAP = [
	['pet-03', '앵무새.jfif'],
	['pet-04', '고슴도치.jfif'],
	['pet-05', '거북이.jfif'],
	['pet-07', '금붕어.jfif'],
	['pet-08', '도마뱀.jfif'],
	['pet-09', '페럿.jfif'],
	['rice-cake-05', '시루떡.jfif'],
	['rice-cake-07', '경단.jfif']
];

for (const [out, file] of MAP) {
	const src = `${SRC}/${file}`;
	if (!existsSync(src)) { console.error('MISSING', file); continue; }
	await sharp(src)
		.resize(384, 384, { fit: 'cover' })
		.webp({ quality: 82 })
		.toFile(`${OUT}/${out}.webp`);
	console.log('OK', out, '←', file);
}
