import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dcinside from './src/crawlers/dcinside.js';
import * as fmkorea from './src/crawlers/fmkorea.js';
import * as instiz from './src/crawlers/instiz.js';
import * as yeosig from './src/crawlers/yeosig.js';
import * as youtube from './src/crawlers/youtube.js';
import { matchComments } from './src/matcher.js';
import * as storage from './src/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const crawlers = { dcinside, fmkorea, instiz, yeosig, youtube };

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

  if (allPosts.length === 0) {
    console.log('[밈 레이더] 수집된 데이터 없음');
    return storage.getMentions();
  }

  // dedup 키 보강: youtube 댓글은 고유 id가 있고, 없는 소스는 source+text로 대체
  for (const p of allPosts) {
    if (p.id == null) p.id = `${p.source}:${p.text}`;
  }

  // 사전 대조 측정 — seen 셋으로 이미 센 댓글은 건너뛰고 신규만 카운트
  const counts = matchComments(allPosts, { seen: storage.getSeen() });
  storage.addMentions(counts);
  storage.setLastCrawl(Date.now());

  const mentions = storage.getMentions();
  const totalNew = counts.reduce((a, c) => a + c.count, 0);
  console.log(`[밈 레이더] 완료! 신규 밈 언급 ${totalNew}건 측정 (누적 반영)`);
  return mentions;
}

// ─── API 라우트 ──────────────────────────────────

// 밈 언급 랭킹 조회
app.get('/api/mentions', (req, res) => {
  res.json({ mentions: storage.getMentions() });
});

// 수동 크롤링(측정)
app.post('/api/refresh', async (req, res) => {
  try {
    const mentions = await runCrawl();
    res.json({ mentions });
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

app.listen(PORT, () => {
  console.log(`[밈 레이더] 서버 시작: http://localhost:${PORT}`);

  // 시작 시 첫 크롤링
  runCrawl();

  // 30분마다 자동 크롤링
  const settings = storage.getSettings();
  setInterval(() => {
    runCrawl();
  }, settings.crawlInterval * 60 * 1000);
});
