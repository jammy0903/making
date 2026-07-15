// 검색수요 발굴 드라이런 — 구글트렌드 후보를 데이터랩 「X / X 뜻」으로 검증해 출력.
// 설계: docs/search-demand-design.md. 기본은 저장 없음(콘솔만), --apply면 관리자 큐 저장.
//
// 사용:
//   node --env-file=.env scripts/discover-search.js                  # 구글트렌드 → 검증(드라이런)
//   node --env-file=.env scripts/discover-search.js --terms=중꺾마,밤티  # 수동 후보로 임계 튜닝
//   node --env-file=.env scripts/discover-search.js --max=10          # 후보 수 제한(기본 20)
//   node --env-file=.env scripts/discover-search.js --dict=path.json  # 밈 사전 로컬 파일(오프라인 dedup)
//   node --env-file=.env scripts/discover-search.js --apply           # 통과분 discovery_candidates 저장

import { readFileSync } from 'node:fs';
import { fetchTrendingKR } from '../src/discovery/gtrends.js';
import * as datalab from '../src/naver/datalab.js';
import { hasTteutSuggestion } from '../src/naver/autocomplete.js';
import * as adkw from '../src/naver/adkeywords.js';
import { normalizeForMatch } from '../src/matcher.js';
import * as supa from '../src/supabase.js';
import { sleep } from '../src/naver/client.js';

const ARGV = process.argv.slice(2);
const arg = (k) => (ARGV.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const APPLY = ARGV.includes('--apply');
const MAX = Number(arg('max')) || 20;

if (!datalab.isConfigured) { console.error('NAVER 키 미설정'); process.exit(1); }

// ── 1) 후보 공급 ──
async function collectCandidates() {
  const out = [];
  const manual = (arg('terms') || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const t of manual) out.push({ term: t, src: 'manual' });
  const trending = await fetchTrendingKR();
  console.log(`[공급] 구글트렌드 ${trending.length}개 · 수동 ${manual.length}개`);
  for (const { term, traffic } of trending) out.push({ term, src: 'gtrends', traffic });
  return out;
}

// ── 2) dedup: 등록밈·기각어 제외 ──
async function loadExclusion() {
  let memes = [];
  try {
    memes = await supa.fetchMemes();
  } catch (err) {
    const p = arg('dict');
    if (!p) throw new Error(`밈 사전 로드 실패(${err.message}) — --dict=<json> 로 대체 가능`);
    memes = JSON.parse(readFileSync(p, 'utf8'));
    console.log(`[dedup] 로컬 사전 사용: ${p} (${memes.length}개)`);
  }
  const kws = new Set();
  for (const m of memes) {
    for (const k of [m.name, ...(m.keywords || [])]) {
      const n = normalizeForMatch(k || '');
      if (n.length >= 2) kws.add(n);
    }
  }
  let rejected = [];
  try { rejected = await supa.fetchRejectedTerms(); } catch { /* 없으면 통과 */ }
  const rejectedSet = new Set(rejected.map((t) => normalizeForMatch(t)));
  return { kws, rejectedSet };
}

function isKnown(term, { kws, rejectedSet }) {
  const n = normalizeForMatch(term);
  if (n.length < 2) return true; // 너무 짧으면 스킵
  if (rejectedSet.has(n)) return true;
  for (const k of kws) if (n.includes(k) || k.includes(n)) return true;
  return false;
}

// ── 3) 검증 ──
async function main() {
  const excl = await loadExclusion();
  const all = await collectCandidates();
  const fresh = [];
  const seen = new Set();
  for (const c of all) {
    const key = normalizeForMatch(c.term);
    if (seen.has(key) || isKnown(c.term, excl)) continue;
    seen.add(key);
    fresh.push(c);
    if (fresh.length >= MAX) break;
  }
  console.log(`[dedup] 신규 후보 ${fresh.length}개 (등록밈·기각어 제외 후)\n`);

  const passed = [];
  for (let i = 0; i < fresh.length; i += 2) {
    const batch = fresh.slice(i, i + 2);
    let series;
    try {
      series = await datalab.fetchPairSeries(batch.map((c) => c.term));
    } catch (err) {
      console.warn(`  [datalab 실패] ${batch.map((c) => c.term).join(', ')}: ${err.message}`);
      continue;
    }
    for (const c of batch) {
      const s = series.get(c.term);
      const v = datalab.judge(s);
      const ratio = v.baseT > 0 ? (v.recentT / v.baseT).toFixed(1) + 'x' : v.transition ? '0→양수' : '-';
      let ac = null;
      if (v.pass) ac = await hasTteutSuggestion(c.term); // 통과분만 가점 확인(호출 절약)
      const mark = v.pass ? '✔' : '✘';
      console.log(`  ${mark} ${c.term} [${c.src}] 뜻:${ratio} X상승:${v.xRising ? 'O' : 'X'}${ac === true ? ' +자동완성' : ''}`);
      if (v.pass) passed.push({ ...c, verdict: v, autocomplete: ac });
    }
    await sleep(250);
  }

  console.log(`\n[결과] 통과 ${passed.length} / 검증 ${fresh.length}`);

  // ── 절대 검색량 보강(검색광고 채널 B) — 통과분에만, 실패해도 진행 ──
  let volumes = new Map();
  if (passed.length && adkw.isConfigured) {
    try {
      volumes = await adkw.fetchVolumes(passed.map((p) => p.term));
      console.log(`[절대량] 검색광고에서 ${volumes.size}/${passed.length}건 회수`);
    } catch (err) {
      console.warn(`[절대량] 보강 실패(무시): ${err.message}`);
    }
  }

  if (passed.length && APPLY) {
    const rows = passed.map((p) => ({
      title: p.term,
      url: `term:${p.term}`, // url UNIQUE 재사용(dedup)
      source_type: 'search-demand',
      kind: 'term',
      term: p.term,
      score: p.verdict.baseT > 0 ? p.verdict.recentT / p.verdict.baseT : 99,
      evidence: {
        src: p.src,
        traffic: p.traffic ?? null,
        monthly: volumes.get(p.term) ?? null, // 절대 월간검색량(검색광고). 신조어는 과소집계 — 참고용
        autocomplete: p.autocomplete,
        tteut: { recent: p.verdict.recentT, base: p.verdict.baseT, transition: p.verdict.transition },
        x: { recent: p.verdict.recentX, base: p.verdict.baseX },
      },
    }));
    const fresh2 = await supa.insertCandidates(rows);
    console.log(`[저장] 관리자 큐에 신규 ${fresh2.length}건 (중복 제외)`);
  } else if (passed.length) {
    console.log('(드라이런 — 저장 안 함. 저장하려면 --apply)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
