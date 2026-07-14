import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dcinside from './src/crawlers/dcinside.js';
import * as fmkorea from './src/crawlers/fmkorea.js';
import * as instiz from './src/crawlers/instiz.js';
import * as yeosig from './src/crawlers/yeosig.js';
import * as youtube from './src/crawlers/youtube.js';
import { prepareMemes, matchToRows } from './src/matcher.js';
import * as supa from './src/supabase.js';
import * as storage from './src/storage.js';
import * as naverClient from './src/naver/client.js';
import * as naverTrend from './src/naver/trend.js';
import * as naverPosts from './src/naver/posts.js';
import * as naverScout from './src/naver/scout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const crawlers = { dcinside, fmkorea, instiz, yeosig, youtube };

// 밈 사전 캐시 (Supabase memes 테이블에서 로드)
let memeDict = [];

async function loadMemes() {
  try {
    const raw = await supa.fetchMemes();
    memeDict = prepareMemes(raw);
    console.log(`[밈 레이더] 밈 사전 ${memeDict.length}개 로드`);
  } catch (err) {
    // Supabase 미연결이어도 서버(프론트 서빙)는 계속 떠 있어야 한다
    console.error('[밈 레이더] 밈 사전 로드 실패:', err.message);
  }
}

// ─── 크롤링 로직 ─────────────────────────────────

async function runCrawl() {
  console.log('[밈 레이더] 크롤링 시작...');
  const settings = storage.getSettings();

  const allPosts = [];
  const crawlPromises = [];

  for (const [name, crawler] of Object.entries(crawlers)) {
    if (settings.sources[name]) {
      crawlPromises.push(
        crawler.crawl().then((posts) => {
          console.log(`[밈 레이더] ${name}: ${posts.length}개 수집`);
          allPosts.push(...posts);
        }).catch((err) => {
          console.error(`[밈 레이더] ${name} 크롤링 실패:`, err.message);
        })
      );
    }
  }

  await Promise.all(crawlPromises);
  storage.setLastCrawl(Date.now());

  if (allPosts.length === 0) {
    console.log('[밈 레이더] 수집된 데이터 없음');
    return 0;
  }

  // dedup 키 보강: youtube 댓글은 고유 id가 있고, 없는 소스는 source+text로 대체
  for (const p of allPosts) {
    if (p.id == null) p.id = `${p.source}:${p.text}`;
  }

  // 사전 대조 → (댓글,밈) 매칭 행
  const rows = matchToRows(allPosts, memeDict);
  if (rows.length === 0) {
    console.log('[밈 레이더] 매칭된 밈 언급 없음');
    return 0;
  }

  // 시간 버킷 부여 후 DB 삽입. PK(meme_id,comment_id) 충돌은 무시(=dedup).
  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);
  const hourBucket = bucket.toISOString();
  const withBucket = rows.map((r) => ({ ...r, hour_bucket: hourBucket }));

  const inserted = await supa.insertMentions(withBucket);
  console.log(
    `[밈 레이더] 완료! 매칭 ${rows.length}건 중 신규 ${inserted.length}건 DB 기록(중복 dedup)`
  );
  return inserted.length;
}

// ─── 네이버 일일 크롤 (트렌드·블로그/카페·발굴) ──────
// 3종 각각 try/catch로 격리 — 하나가 실패해도 나머지·본체에 영향 없음.
async function runNaver() {
  if (!naverClient.isConfigured) {
    console.error('[네이버] NAVER_CLIENT_ID/SECRET 미설정 — 네이버 크롤러 3종 건너뜀');
    return;
  }
  naverClient.resetCalls();
  console.log('[네이버] 일일 크롤 시작...');

  let memes = [];
  try {
    memes = await supa.fetchMemes(); // 원본(id·name·keywords) — 네이버 크롤러가 직접 사용
  } catch (err) {
    console.error('[네이버] 밈 로드 실패:', err.message);
  }

  try { await naverTrend.run(memes); } catch (err) { console.error('[네이버] trend 실패:', err.message); }
  try { await naverPosts.run(memes); } catch (err) { console.error('[네이버] posts 실패:', err.message); }
  try { await naverScout.run(memes); } catch (err) { console.error('[네이버] scout 실패:', err.message); }

  const used = naverClient.callCount();
  console.log(`[네이버] 완료. 이번 실행 API 호출 ${used}회 / 일일한도 25,000 (${(used / 25000 * 100).toFixed(1)}%)`);
}

// ─── API 라우트 ──────────────────────────────────

// 밈 언급 랭킹 조회 (Supabase 뷰 meme_rankings)
app.get('/api/mentions', async (req, res) => {
  try {
    const mentions = await supa.fetchRankings();
    res.json({ mentions });
  } catch (err) {
    console.error('랭킹 조회 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// 수동 크롤링(측정)
app.post('/api/refresh', async (req, res) => {
  try {
    const insertedCount = await runCrawl();
    const mentions = await supa.fetchRankings();
    res.json({ insertedCount, mentions });
  } catch (err) {
    console.error('크롤링 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// 네이버 일일 크롤 수동 트리거 (오래 걸리므로 fire-and-forget)
app.post('/api/naver/run', (req, res) => {
  runNaver().catch((e) => console.error('[네이버] 크롤 실패:', e.message));
  res.json({ started: true });
});

// 데이터랩 백필 — 배포 첫날 지난 몇 달치 트렌드 시계열 소급 적재(1회성)
app.post('/api/naver/backfill', (req, res) => {
  (async () => {
    if (!naverClient.isConfigured) return console.error('[네이버] 키 미설정 — 백필 스킵');
    naverClient.resetCalls();
    const memes = await supa.fetchMemes().catch(() => []);
    await naverTrend.run(memes, { backfill: true });
  })().catch((e) => console.error('[네이버] 백필 실패:', e.message));
  res.json({ started: true });
});

// 상태 조회
app.get('/api/status', (req, res) => {
  const lastCrawl = storage.getLastCrawl();
  res.json({ lastCrawl });
});

// 프론트가 Supabase에 직접 붙기 위한 공개 설정.
// anon 키는 공개 노출이 안전하도록 설계된 값(RLS로 방어). service role 키는 절대 내보내지 않는다.
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.PUBLIC_SUPABASE_ANON_KEY || '',
  });
});

// 설정 조회
app.get('/api/settings', (req, res) => {
  res.json({ settings: storage.getSettings() });
});

// 설정 저장
app.post('/api/settings', (req, res) => {
  const { settings } = req.body;
  storage.saveSettings(settings);
  res.json({ ok: true });
});

// 데이터 초기화
app.post('/api/clear-data', (req, res) => {
  storage.clearData();
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ─── 서버 시작 ───────────────────────────────────

app.listen(PORT, async () => {
  console.log(`[밈 레이더] 서버 시작: http://localhost:${PORT}`);

  // 밈 사전 로드 후 첫 크롤링 (실패해도 서버는 계속 — 프론트 서빙 유지)
  await loadMemes();
  runCrawl().catch((e) => console.error('[밈 레이더] 크롤 실패:', e.message));

  // 설정 주기마다: 사전 갱신 + 크롤링
  const settings = storage.getSettings();
  setInterval(async () => {
    await loadMemes();
    runCrawl().catch((e) => console.error('[밈 레이더] 크롤 실패:', e.message));
  }, settings.crawlInterval * 60 * 1000);

  // 네이버 크롤은 하루 1회. 시작 시엔 자동 실행하지 않는다(재시작마다 호출 소모 방지).
  // 최초 실행은 POST /api/naver/run 으로 트리거하거나 24h 주기를 기다린다.
  // (서버리스/크론 환경이면 이 주기 대신 스케줄러로 /api/naver/run 을 호출할 것.)
  setInterval(() => {
    runNaver().catch((e) => console.error('[네이버] 크롤 실패:', e.message));
  }, 24 * 60 * 60 * 1000);
});
