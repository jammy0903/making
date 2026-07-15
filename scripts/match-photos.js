// 밈 사진 자동 매칭 — 네이버 이미지 검색 API로 밈 이름에 맞는 이미지를 찾는다.
// 이 환경에선 Supabase 직접 접속이 막혀 있어(네이버는 열림), 두 가지 흐름을 지원:
//
//  (A) SQL 파일만 뽑기 (권장 — DB는 사람이 직접 붙임):
//      1) 대상 목록 JSON 준비:  [{ "id": 1, "name": "중꺾마" }, ...]  (사진 없는 밈)
//      2) node --env-file=.env scripts/match-photos.js --from=scripts/targets.json --sql
//      → db/photo_matches.sql 생성 → Supabase SQL Editor에 붙여넣기
//
//  (B) Supabase 접속이 되는 환경이면 직접 반영:
//      node --env-file=.env scripts/match-photos.js --apply           # 사진 없는 밈 전체
//      node --env-file=.env scripts/match-photos.js --apply 15         # 앞 15개만
//      (--from 없이 실행하면 Supabase REST로 대상(photo_url 빈 밈)을 읽어온다)
//
// 공통 옵션:  <숫자> = 앞 N개만 처리 (예: 30)
// 안전장치: 이미 photo_url 있는 밈은 대상에서 제외(모드 A는 목록 준비 시, 모드 B는 쿼리로).

import { readFileSync, writeFileSync } from 'node:fs';
import * as naver from '../src/naver/client.js';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const SQL = ARGV.some((a) => a === '--sql' || a.startsWith('--sql='));
const SQL_OUT = (ARGV.find((a) => a.startsWith('--sql=')) || '--sql=db/photo_matches.sql').split('=')[1];
const FROM = (ARGV.find((a) => a.startsWith('--from=')) || '').split('=')[1];
const LIMIT = Number(ARGV.find((a) => /^\d+$/.test(a))) || Infinity;

const SB_URL = process.env.PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!naver.isConfigured) { console.error('NAVER 키 미설정'); process.exit(1); }

const sb = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...opts.headers } });

// 대상 로드: --from JSON 우선, 없으면 Supabase REST(사진 없는 밈)
async function loadTargets() {
  if (FROM) {
    const arr = JSON.parse(readFileSync(FROM, 'utf8'));
    return arr.filter((m) => m && m.id != null && m.name).map((m) => ({ id: m.id, name: m.name }));
  }
  if (!SB_URL || !SB_KEY) { console.error('대상 소스 없음: --from=<json> 를 주거나 SUPABASE 환경변수를 설정하세요'); process.exit(1); }
  const r = await sb('memes?select=id,name&or=(photo_url.is.null,photo_url.eq.)&order=id');
  if (!r.ok) throw new Error(`memes 조회 ${r.status}: ${await r.text()}`);
  return r.json();
}

// 네이버 이미지 검색 → 안정적인 thumbnail(phinf CDN) URL. 이름+"짤" 우선, 없으면 이름만.
async function findImage(name) {
  const q = naver.sanitizeKeyword(name) || name;
  for (const query of [`${q} 짤`, q]) {
    const res = await naver.naverGet('/v1/search/image.json', { query, display: 1, sort: 'sim', filter: 'medium' });
    if (res.status === 429) { await naver.sleep(1500); continue; }
    if (!res.ok) { console.warn(`  [검색 실패 ${res.status}] ${query}`); continue; }
    const data = await res.json();
    const hit = data.items && data.items[0];
    if (hit && hit.thumbnail) return hit.thumbnail;
  }
  return null;
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`; // 작은따옴표 이스케이프

async function setPhoto(id, url) {
  const r = await sb(`memes?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ photo_url: url }),
  });
  if (!r.ok) throw new Error(`PATCH ${id} ${r.status}: ${await r.text()}`);
}

async function main() {
  const targets = (await loadTargets()).slice(0, LIMIT);
  const mode = SQL ? `SQL→${SQL_OUT}` : APPLY ? '직접 반영' : '드라이런';
  console.log(`[match-photos] 대상 ${targets.length}개 · 모드=${mode}`);

  const sqlLines = ['-- 밈 사진 자동 매칭 (네이버 이미지 검색). Supabase SQL Editor에 붙여넣기.'];
  let matched = 0, applied = 0, missed = 0;

  for (const m of targets) {
    let url = null;
    try { url = await findImage(m.name); } catch (e) { console.warn(`  [오류] ${m.name}: ${e.message}`); }
    if (url) {
      matched++;
      console.log(`  ✔ ${m.name}\n      ${url}`);
      if (SQL) sqlLines.push(`update memes set photo_url = ${sqlStr(url)} where id = ${m.id} and coalesce(photo_url,'') = '';`);
      if (APPLY) { await setPhoto(m.id, url); applied++; }
    } else {
      missed++;
      console.log(`  ✘ ${m.name} (매칭 없음)`);
    }
    await naver.sleep(120);
  }

  if (SQL) {
    writeFileSync(SQL_OUT, sqlLines.join('\n') + '\n');
    console.log(`\n[match-photos] SQL ${matched}건 → ${SQL_OUT}`);
  }
  console.log(`[match-photos] 매칭 ${matched} · 미매칭 ${missed}${APPLY ? ` · 반영 ${applied}` : ''} · 네이버 호출 ${naver.callCount()}회`);
}

main().catch((e) => { console.error(e); process.exit(1); });
