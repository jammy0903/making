import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as supa from './src/supabase.js';
import * as storage from './src/storage.js';
import { loadMemeDict, runCommentCrawl, runNaver } from './src/pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// 밈 사전 캐시 (Supabase memes 테이블에서 로드)
let memeDict = [];
async function refreshMemes() {
  memeDict = await loadMemeDict();
}
async function crawl() {
  const n = await runCommentCrawl(memeDict, storage.getSettings().sources);
  storage.setLastCrawl(Date.now());
  return n;
}

// ─── API 라우트 ──────────────────────────────────

// 밈 언급 랭킹 조회 (Supabase 뷰 meme_rankings)
app.get('/api/mentions', async (req, res) => {
  try {
    res.json({ mentions: await supa.fetchRankings() });
  } catch (err) {
    console.error('랭킹 조회 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// 수동 크롤링(측정)
app.post('/api/refresh', async (req, res) => {
  try {
    const insertedCount = await crawl();
    res.json({ insertedCount, mentions: await supa.fetchRankings() });
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
  runNaver({ backfill: true }).catch((e) => console.error('[네이버] 백필 실패:', e.message));
  res.json({ started: true });
});

// 상태 조회
app.get('/api/status', (req, res) => {
  res.json({ lastCrawl: storage.getLastCrawl() });
});

// 프론트가 Supabase에 직접 붙기 위한 공개 설정.
// anon 키는 공개 노출이 안전하도록 설계된 값(RLS로 방어). service role 키는 절대 내보내지 않는다.
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.PUBLIC_SUPABASE_ANON_KEY || '',
  });
});

// 설정 조회/저장
app.get('/api/settings', (req, res) => res.json({ settings: storage.getSettings() }));
app.post('/api/settings', (req, res) => { storage.saveSettings(req.body.settings); res.json({ ok: true }); });

// 데이터 초기화
app.post('/api/clear-data', (req, res) => { storage.clearData(); res.json({ ok: true }); });

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ─── 서버 시작 ───────────────────────────────────

app.listen(PORT, async () => {
  console.log(`[밈 레이더] 서버 시작: http://localhost:${PORT}`);

  // 밈 사전 로드 후 첫 크롤링 (실패해도 서버는 계속 — 프론트 서빙 유지)
  await refreshMemes();
  crawl().catch((e) => console.error('[밈 레이더] 크롤 실패:', e.message));

  // 설정 주기마다: 사전 갱신 + 크롤링
  const settings = storage.getSettings();
  setInterval(async () => {
    await refreshMemes();
    crawl().catch((e) => console.error('[밈 레이더] 크롤 실패:', e.message));
  }, settings.crawlInterval * 60 * 1000);

  // 네이버 크롤은 하루 1회. 시작 시엔 자동 실행하지 않는다(재시작마다 호출 소모 방지).
  // (서버리스/크론 환경이면 이 주기 대신 GitHub Actions 등으로 crawl-once를 스케줄할 것.)
  setInterval(() => {
    runNaver().catch((e) => console.error('[네이버] 크롤 실패:', e.message));
  }, 24 * 60 * 60 * 1000);
});
