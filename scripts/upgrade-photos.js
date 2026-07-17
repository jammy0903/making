// 사진 화질 복구 — 네이버 프록시(search.pstatic.net) URL은 원본을 저화질 JPEG로
// 재압축한다. 프록시 URL 안에 원본 주소(src=)가 그대로 박혀 있으므로, 그걸 꺼내
// "원본이 실제로 로딩되고 + 너무 크지 않을 때만" photo_url 을 원본으로 교체한다.
//
// 안전 원칙:
//  - 원본을 실제로 GET → 매직바이트로 진짜 이미지인지 검증(에러 HTML 걸러냄).
//  - 2MB 이상(대형 움짤/스샷)은 페이지 로딩 무거워지므로 프록시 유지.
//  - 원본이 죽었으면(4xx/5xx/오류) 프록시 유지 — 네이버 캐시가 유일 생존본.
//  → 뜨는 프록시를 깨진 원본으로 바꾸는 일은 절대 없음.
//  - 교체 전 기존 값 전량 백업(db/photo_url_backup.json) → 되돌리기 가능.
//
// 사용:
//   node --env-file=.env scripts/upgrade-photos.js            # 드라이런(변경 안 함)
//   node --env-file=.env scripts/upgrade-photos.js --apply    # 실제 반영
//   node --env-file=.env scripts/upgrade-photos.js --apply 30 # 앞 30개만

import { writeFileSync } from 'node:fs';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const LIMIT = Number(ARGV.find((a) => /^\d+$/.test(a))) || Infinity;
const MAX_BYTES = 2_000_000; // 2MB 이상은 프록시 유지

const SB_URL = process.env.PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('SUPABASE 환경변수 미설정'); process.exit(1); }

const sb = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...opts.headers } });

// 프록시 URL(...?...&src=<encoded original>)에서 원본 주소 추출
function originalOf(proxyUrl) {
  const m = proxyUrl.match(/[?&]src=([^&]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

// 매직바이트로 실제 이미지인지 판정(png/jpeg/gif/webp/bmp)
function isImage(buf) {
  if (buf.length < 12) return false;
  const b = buf;
  if (b[0] === 0x89 && b[1] === 0x50) return true;                 // PNG
  if (b[0] === 0xff && b[1] === 0xd8) return true;                 // JPEG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true; // GIF
  if (b[0] === 0x42 && b[1] === 0x4d) return true;                 // BMP
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return true; // RIFF...WEBP
  return false; // 그 외는 호출부에서 content-type 으로 보조판정
}

// 원본을 브라우저처럼(no-referrer) 받아 검증. { ok, size, reason }
async function probe(url) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 12000);
    const res = await fetch(url, {
      redirect: 'follow', signal: c.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', Accept: 'image/avif,image/webp,image/*,*/*' },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const ct = (res.headers.get('content-type') || '').split(';')[0];
    const buf = Buffer.from(await res.arrayBuffer());
    const looksImg = isImage(buf) || /^image\//.test(ct) || ct === 'application/octet-stream';
    if (!looksImg) return { ok: false, reason: `not-image(${ct})` };
    if (buf.length >= MAX_BYTES) return { ok: false, reason: `too-big(${(buf.length / 1e6).toFixed(1)}MB)` };
    if (buf.length < 512) return { ok: false, reason: 'too-small' };
    return { ok: true, size: buf.length };
  } catch (e) { return { ok: false, reason: e.name }; }
}

async function main() {
  const r = await sb('memes?select=id,name,photo_url&photo_url=like.*pstatic*&order=id');
  if (!r.ok) throw new Error(`memes 조회 ${r.status}: ${await r.text()}`);
  const rows = (await r.json()).slice(0, LIMIT);
  console.log(`[upgrade-photos] 프록시 사진 ${rows.length}장 · 모드=${APPLY ? '반영' : '드라이런'}`);

  const CONC = 8;
  const plan = []; // { id, name, from, to }
  const keep = []; // { id, reason }
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const m = rows[idx++];
      const orig = originalOf(m.photo_url);
      if (!orig) { keep.push({ id: m.id, reason: 'src 없음' }); continue; }
      const p = await probe(orig);
      if (p.ok) plan.push({ id: m.id, name: m.name, from: m.photo_url, to: orig, size: p.size });
      else keep.push({ id: m.id, name: m.name, reason: p.reason });
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  console.log(`\n교체 대상 ${plan.length}장 · 프록시 유지 ${keep.length}장`);
  console.log('유지 사유 요약:');
  const reasonCount = {};
  for (const k of keep) { const key = k.reason.replace(/\([^)]*\)/, ''); reasonCount[key] = (reasonCount[key] || 0) + 1; }
  for (const [reason, n] of Object.entries(reasonCount).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${reason}`);

  if (!APPLY) {
    console.log('\n(드라이런) --apply 로 실제 반영. 샘플 5건:');
    for (const p of plan.slice(0, 5)) console.log(`  #${p.id} ${p.name}\n    → ${p.to.slice(0, 90)}`);
    return;
  }

  // 백업 먼저(되돌리기용): 교체 대상의 기존 값
  writeFileSync('db/photo_url_backup.json', JSON.stringify(plan.map(({ id, name, from }) => ({ id, name, from })), null, 2));
  console.log(`\n백업 저장: db/photo_url_backup.json (${plan.length}건)`);

  let done = 0, failed = 0;
  for (const p of plan) {
    const res = await sb(`memes?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ photo_url: p.to }),
    });
    if (res.ok) done++;
    else { failed++; console.warn(`  PATCH ${p.id} 실패 ${res.status}: ${await res.text()}`); }
  }
  console.log(`[upgrade-photos] 반영 ${done} · 실패 ${failed} · 유지 ${keep.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
