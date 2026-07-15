// 후보 이미지 검색 — 밈당 여러 후보를 뽑아 리뷰용 candidates.json 생성.
// 두 질의(name+"짤", name)를 합쳐 다양성 확보. 사람이 눈으로 고른다.
//   node --env-file=.env scripts/search-candidates.js scripts/targets-review.json [N]
import { readFileSync, writeFileSync } from 'node:fs';
import * as naver from '../src/naver/client.js';

const FROM = process.argv[2];
const PER = Number(process.argv[3]) || 4;
if (!FROM) { console.error('대상 JSON 경로를 주세요'); process.exit(1); }
if (!naver.isConfigured) { console.error('NAVER 키 미설정'); process.exit(1); }

async function searchThumbs(query) {
  const res = await naver.naverGet('/v1/search/image.json', { query, display: 10, sort: 'sim', filter: 'medium' });
  if (res.status === 429) { await naver.sleep(1500); return []; }
  if (!res.ok) { console.warn(`  [검색 실패 ${res.status}] ${query}`); return []; }
  const data = await res.json();
  return (data.items || []).map((it) => it.thumbnail).filter(Boolean);
}

async function main() {
  const targets = JSON.parse(readFileSync(FROM, 'utf8'));
  const out = [];
  for (const m of targets) {
    const q = naver.sanitizeKeyword(m.name) || m.name;
    const seen = new Set();
    const urls = [];
    for (const query of [`${q} 짤`, q]) {
      for (const u of await searchThumbs(query)) {
        if (!seen.has(u)) { seen.add(u); urls.push(u); }
        if (urls.length >= PER) break;
      }
      if (urls.length >= PER) break;
      await naver.sleep(120);
    }
    out.push({ id: m.id, name: m.name, urls: urls.slice(0, PER) });
    console.log(`  ${m.name}: ${urls.length}개`);
    await naver.sleep(120);
  }
  writeFileSync('scripts/candidates.json', JSON.stringify(out, null, 1));
  console.log(`\n후보 → scripts/candidates.json (${out.length}밈) · 네이버 호출 ${naver.callCount()}회`);
}
main().catch((e) => { console.error(e); process.exit(1); });
