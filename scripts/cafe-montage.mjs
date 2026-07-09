import sharp from 'sharp';
import { existsSync } from 'node:fs';

const OUT = '/home/jammy/projects/making/static/gen';
const SCRATCH = '/tmp/claude-1000/-home-jammy-projects-making/54ef9f20-0500-491e-a289-6f6f6801d65f/scratchpad';

const NAMES = ['스타벅스','메가커피','공차','커스텀커피','바나프레소','우지커피','투썸','할리스','폴바셋','파스쿠찌','더벤티','이디야','컴포즈','빽다방','블루보틀','텐퍼센트','아마스빈','하삼동커피','매머드커피','감성커피','아티제','요거프레소','포비','빈브라더스','만랩커피','탐앤탐스','드롭탑','유동커피','디저트39','엔젤리너스','카페베네','달콤커피','커피베이','더리터','카페봄봄','카페051','카페게이트','팔공티','쥬씨','타이거슈가','테라로사'];

const cell = 150, cols = 7;
const rows = Math.ceil(NAMES.length / cols);
const composites = [];
for (let i = 0; i < NAMES.length; i++) {
	const idx = String(i).padStart(2, '0');
	const f = `${OUT}/cafe-${idx}.webp`;
	const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
	if (existsSync(f)) {
		const buf = await sharp(f).resize(cell, cell, { fit: 'contain', background: '#eeeeee' }).toBuffer();
		composites.push({ input: buf, left: x, top: y });
	}
	const label = Buffer.from(`<svg width="${cell}" height="20"><rect width="100%" height="100%" fill="black" opacity="0.6"/><text x="4" y="15" font-size="13" fill="white">${i}:${NAMES[i]}</text></svg>`);
	composites.push({ input: label, left: x, top: y + cell - 20 });
}
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#ffffff' } })
	.composite(composites).png().toFile(`${SCRATCH}/cafe-montage.png`);
console.log('done');
