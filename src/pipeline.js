// 크롤 파이프라인 (서버·CI 공용). "한 번 실행" 단위 — setInterval 같은 스케줄은 호출측 책임.
// 서버(server.js)와 단발 실행(scripts/crawl-once.js, GitHub Actions)이 이 함수들을 공유한다.

import * as dcinside from './crawlers/dcinside.js';
import * as fmkorea from './crawlers/fmkorea.js';
import * as instiz from './crawlers/instiz.js';
import * as yeosig from './crawlers/yeosig.js';
import * as youtube from './crawlers/youtube.js';
import { prepareMemes, matchToRows } from './matcher.js';
import * as supa from './supabase.js';
import * as naverClient from './naver/client.js';
import * as naverTrend from './naver/trend.js';
import * as naverPosts from './naver/posts.js';
import * as naverScout from './naver/scout.js';

export const crawlers = { dcinside, fmkorea, instiz, yeosig, youtube };

// 밈 사전 로드(정제 완료). 실패해도 []를 반환해 호출측이 계속 뜨게 한다.
export async function loadMemeDict() {
  try {
    const dict = prepareMemes(await supa.fetchMemes());
    console.log(`[memedics] 밈 사전 ${dict.length}개 로드`);
    return dict;
  } catch (err) {
    console.error('[memedics] 밈 사전 로드 실패:', err.message);
    return [];
  }
}

// 댓글/텍스트 소스 크롤 → 사전 대조 매칭 → mention_counts 기록. 반환: 신규 삽입 수.
//   sources: {name:bool} 켤 소스 필터(생략 시 전체). 소스별 실패는 격리.
export async function runCommentCrawl(memeDict, sources) {
  console.log('[memedics] 크롤링 시작...');
  const allPosts = [];
  await Promise.all(
    Object.entries(crawlers)
      .filter(([name]) => !sources || sources[name])
      .map(([name, c]) =>
        c.crawl()
          .then((posts) => { console.log(`[memedics] ${name}: ${posts.length}개 수집`); allPosts.push(...posts); })
          .catch((err) => console.error(`[memedics] ${name} 크롤링 실패:`, err.message))
      )
  );

  if (allPosts.length === 0) { console.log('[memedics] 수집된 데이터 없음'); return 0; }

  // dedup 키 보강 후 매칭
  for (const p of allPosts) if (p.id == null) p.id = `${p.source}:${p.text}`;
  const rows = matchToRows(allPosts, memeDict);
  if (rows.length === 0) { console.log('[memedics] 매칭된 밈 언급 없음'); return 0; }

  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);
  const hourBucket = bucket.toISOString();
  const inserted = await supa.insertMentions(rows.map((r) => ({ ...r, hour_bucket: hourBucket })));
  console.log(`[memedics] 완료! 매칭 ${rows.length}건 중 신규 ${inserted.length}건 DB 기록(dedup)`);
  return inserted.length;
}

// 네이버 3종(트렌드·블로그/카페·발굴). 각 try/catch 격리. 키 없으면 스킵.
export async function runNaver({ backfill = false } = {}) {
  if (!naverClient.isConfigured) {
    console.error('[네이버] 키 미설정 — 네이버 크롤러 건너뜀');
    return;
  }
  naverClient.resetCalls();
  console.log(`[네이버] 크롤 시작${backfill ? ' (백필)' : ''}...`);

  let memes = [];
  try { memes = await supa.fetchMemes(); } catch (err) { console.error('[네이버] 밈 로드 실패:', err.message); }

  try { await naverTrend.run(memes, { backfill }); } catch (err) { console.error('[네이버] trend 실패:', err.message); }
  if (!backfill) {
    try { await naverPosts.run(memes); } catch (err) { console.error('[네이버] posts 실패:', err.message); }
    try { await naverScout.run(memes); } catch (err) { console.error('[네이버] scout 실패:', err.message); }
  }

  const used = naverClient.callCount();
  console.log(`[네이버] 완료. API 호출 ${used}회 / 일일한도 25,000 (${(used / 25000 * 100).toFixed(1)}%)`);
}
