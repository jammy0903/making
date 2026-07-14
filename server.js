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

// 상태 조회
app.get('/api/status', (req, res) => {
  const lastCrawl = storage.getLastCrawl();
  res.json({ lastCrawl });
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
});
