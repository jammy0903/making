// 단발 크롤 실행 (GitHub Actions·수동용). 서버 없이 파이프라인을 1회 돌리고 종료한다.
// 사용: node scripts/crawl-once.js [all|comments|naver|backfill]
//   env는 프로세스 환경변수에서 읽음(CI는 secrets, 로컬은 --env-file 또는 export).

import { loadMemeDict, runCommentCrawl, runNaver } from '../src/pipeline.js';

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

console.log('[crawl-once] 종료');
process.exit(0);
