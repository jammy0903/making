import sharp from 'sharp';
import { existsSync } from 'node:fs';

const SRC = '/mnt/c/Users/ksj/Pictures/making';
const OUT = '/home/jammy/projects/making/static/gen';

// index-aligned to samples cafe candidates
const MAP = [
	['스타벅스', '스타벅스.jfif'],
	['메가커피', '메가커피.jfif'],
	['공차', '공차.jfif'],
	['커스텀커피', '커스텀커피.jfif'],
	['바나프레소', '바나프레소.jfif'],
	['우지커피', '우지커피.jfif'],
	['투썸', '투썸.png'],
	['할리스', '할리스.jfif'],
	['폴바셋', '폴바셋.jfif'],
	['파스쿠찌', '파스쿠찌.jfif'],
	['더벤티', '더벤티.jfif'],
	['이디야', '이디야.jfif'],
	['컴포즈', '컴포즈.jfif'],
	['빽다방', '뻬다방.jfif'],
	['블루보틀', '블루보틀.jfif'],
	['텐퍼센트', null],
	['아마스빈', '아마스빈.jfif'],
	['하삼동커피', null],
	['매머드커피', '매머드커피.jfif'],
	['감성커피', '감성커피.jfif'],
	['아티제', '아티제.jfif'],
	['요거프레소', '요거프레소.jfif'],
	['포비', 'fourb카페.jfif'],
	['빈브라더스', '빈브라더스커피하우스.jfif'],
	['만랩커피', '만랩커피.jfif'],
	['탐앤탐스', '탐앤탐스.jfif'],
	['드롭탑', '드롭탑.jfif'],
	['유동커피', '유동커피.jfif'],
	['디저트39', '디저트39.jfif'],
	['엔젤리너스', '엔젤리너스.png'],
	['카페베네', '카페베네.jfif'],
	['달콤커피', '달콤커피.jfif'],
	['커피베이', '커피베이.jfif'],
	['더리터', '더리터.jfif'],
	['카페봄봄', '카페봄봄.png'],
	['카페051', 'cafe051.jfif'],
	['카페게이트', '카페게이트.jfif'],
	['팔공티', '팔공티.jfif'],
	['쥬씨', '쥬씨.jfif'],
	['타이거슈가', '타이거슈가.jfif'],
	['테라로사', '테라로사.jfif']
];

const images = [];
for (let i = 0; i < MAP.length; i++) {
	const [name, file] = MAP[i];
	if (!file) { images.push(''); continue; }
	const src = `${SRC}/${file}`;
	if (!existsSync(src)) { console.error('MISSING', name, file); images.push(''); continue; }
	const idx = String(i).padStart(2, '0');
	const dst = `${OUT}/cafe-${idx}.webp`;
	await sharp(src)
		.resize(384, 384, { fit: 'contain', background: '#ffffff' })
		.webp({ quality: 82 })
		.toFile(dst);
	images.push(`/gen/cafe-${idx}.webp`);
}

console.log('images array:');
console.log('[');
console.log(images.map((s) => `\t\t\t\t${s ? `'${s}'` : `''`}`).join(',\n'));
console.log(']');
