// 단발 크롤 실행 (GitHub Actions·수동용). 서버 없이 파이프라인을 1회 돌리고 종료한다.
// 사용: node scripts/crawl-once.js [all|comments|naver|backfill]
//   env는 프로세스 환경변수에서 읽음(CI는 secrets, 로컬은 --env-file 또는 export).

import { loadMemeDict, runCommentCrawl, runNaver } from '../src/pipeline.js';
import { snapshotRanking } from '../src/supabase.js';

const mode = process.argv[2] || 'all';
console.log(`[crawl-once] mode=${mode}`);

if (mode === 'comments' || mode === 'all') {
  const dict = await loadMemeDict();
  await runCommentCrawl(dict); // 소스 필터 없음 → 전체 소스
}
if (mode === 'naver' || mode === 'all') {
  await runNaver();
}
if (mode === 'backfill') {
  await runNaver({ backfill: true });
}

// 크롤 결과가 반영된 직후의 순위를 그날의 스냅샷으로 고정 (베팅 정산·변동성 측정 재료)
const snapped = await snapshotRanking();
console.log(`[crawl-once] rank_snapshots ${snapped}행 적재`);

console.log('[crawl-once] 종료');
process.exit(0);
