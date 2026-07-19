// 하우스 광고(걷는 강아지) 이미지 축소 — static/ads/dogs/*.webp
//
// 문제: 원본이 780~1100px 폭인데 화면에는 108px 폭으로만 그려진다(WalkingDog.svelte
// `.walk-dog { width: 108px }`). 면적 기준 약 64배 과대라, 홈 이미지 전송량 590KB 중
// 344KB가 이 장식이었다. 밈 사진이 아니라 순수 장식이 절반 이상을 먹던 셈.
//
// 안전 원칙:
//  - 원본은 git이 추적 중이라 되돌리기는 `git checkout -- static/ads/dogs` 한 줄이다.
//  - 그래도 덮어쓰기 전 --apply 를 요구한다(기본은 드라이런, 무엇이 어떻게 줄지만 출력).
//  - 확대는 하지 않는다(withoutEnlargement) — 이미 작은 파일을 늘려 화질을 버리지 않는다.
//  - 결과가 원본보다 크면 그 파일은 건너뛴다(축소가 손해인 경우 방지).
//
// 사용:
//   node scripts/resize-dog-ads.js           # 드라이런
//   node scripts/resize-dog-ads.js --apply   # 실제 덮어쓰기

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'static/ads/dogs';
const APPLY = process.argv.includes('--apply');

// 표시 폭 108px의 2배 — 레티나 데스크톱까지 선명하게. (모바일에선 아예 숨기는 광고다)
const TARGET_W = 216;
const QUALITY = 82;

const kb = (n) => (n / 1024).toFixed(1) + 'KB';

const files = readdirSync(DIR).filter((f) => f.endsWith('.webp')).sort();
let before = 0;
let after = 0;
let skipped = 0;

for (const f of files) {
  const path = join(DIR, f);
  const orig = statSync(path).size;
  const meta = await sharp(path).metadata();

  const out = await sharp(path)
    .resize({ width: TARGET_W, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  before += orig;

  if (out.length >= orig) {
    // 축소가 손해면 그대로 둔다
    after += orig;
    skipped++;
    console.log(`  skip  ${f.padEnd(22)} ${meta.width}px ${kb(orig)} → 축소 이득 없음`);
    continue;
  }

  after += out.length;
  console.log(
    `  ${APPLY ? 'write' : 'dry  '} ${f.padEnd(22)} ${meta.width}→${TARGET_W}px  ${kb(orig)} → ${kb(out.length)}`
  );
  if (APPLY) writeFileSync(path, out);
}

console.log(
  `\n${files.length}장 | ${kb(before)} → ${kb(after)} (${(100 - (after / before) * 100).toFixed(0)}% 감소)` +
    (skipped ? ` | 건너뜀 ${skipped}장` : '')
);
if (!APPLY) console.log('드라이런입니다. 실제 반영하려면 --apply 를 붙이세요.');
