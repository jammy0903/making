// 밈 발굴 드라이런 — 크롤 원문에서 "미등록 신조어/밈 후보"를 하이쿠로 뽑아 콘솔 출력만.
// ⚠️ DB에 저장하지 않는다(품질 확인 전용). 쓸만하면 그때 discovery_candidates 배선을 붙인다.
// 사용: node --env-file=.env scripts/discover-memes.js [최대게시글수]
//   env: claude_key(하이쿠), youtube_data_api_key(유튜브 크롤), Supabase(밈 사전) 필요.

import { crawlers, loadMemeDict } from '../src/pipeline.js';
import { matchToRows } from '../src/matcher.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_POSTS = Number(process.argv[2]) || 400; // 하이쿠에 보낼 상한(비용/토큰 제어)
const BATCH = 80; // 한 번에 보내는 게시글 수
const API_KEY = process.env.claude_key;

if (!API_KEY) {
  console.error('[discover] .env의 claude_key 없음 — 중단');
  process.exit(1);
}

// 하이쿠 1회 호출 → 후보 배열 반환. 실패/파싱오류는 [] 로 격리(전체 중단 방지).
async function askHaiku(posts, registeredNames) {
  const numbered = posts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `당신은 한국 인터넷 밈/신조어 판별 전문가입니다.
아래 커뮤니티 게시글·댓글에서 "밈/유행어"만 골라내세요. 정밀도가 최우선입니다 — 애매하면 무조건 버리세요. 0개여도 좋습니다.

'밈/유행어'의 기준(아래를 모두 만족해야 함):
- 국어사전에 있는 표준 단어가 아니라, 인터넷/커뮤니티에서 최근 생겨나 퍼진 신조어·밈·유행 표현
- 특정 커뮤니티/세대가 알아듣는 관용구 (예: 야구·게임·방송 유래 밈)

무조건 제외(이런 건 밈이 아님):
- 국어사전에 나오는 일반 단어·감정 표현: 예) "개차반", "뭉클하다", "휴머니즘", "사람 냄새", "감동"
- 뉴스/시사 고유명사, 사람·작품·브랜드 이름, 단순 욕설, 오타·잘못 잘린 문장
- 이미 등록된 밈(아래 목록)

밈인 예시(이런 결이면 채택): "거를 타선이 없다"(=버릴 게 없다, 야구 유래), "중꺾마", "알빠노", "억까"

이미 등록된 밈(제외): ${registeredNames.join(', ') || '(없음)'}

게시글/댓글:
${numbered}

JSON 배열로만 답하세요(설명 금지). 각 항목:
{"term":"표현","meaning":"추정 뜻","evidence":"근거가 된 원문 1개(그대로)","confidence":1~5}
확신 4 이상인 것만 넣으세요. 후보가 없으면 [] 만 출력.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error(`[discover] 하이쿠 ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return [];
    }
    const data = await res.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error('[discover] 하이쿠 호출/파싱 실패:', err.message);
    return [];
  }
}

// ── 1) 크롤 (기존 크롤러 재사용, 추가 인프라 없음) ──
console.log('[discover] 크롤 시작...');
const allPosts = [];
await Promise.all(
  Object.entries(crawlers).map(([name, c]) =>
    c.crawl()
      .then((posts) => { console.log(`[discover] ${name}: ${posts.length}개`); allPosts.push(...posts); })
      .catch((err) => console.error(`[discover] ${name} 실패:`, err.message))
  )
);
console.log(`[discover] 총 ${allPosts.length}개 수집`);
if (allPosts.length === 0) { console.log('[discover] 데이터 없음 — 종료'); process.exit(0); }

// ── 2) 이미 등록된 밈에 매칭되는 글은 제외(= 아는 밈은 발굴 대상 아님) ──
const dict = await loadMemeDict();
for (const p of allPosts) if (p.id == null) p.id = `${p.source}:${p.text}`;
const matchedIds = new Set(matchToRows(allPosts, dict).map((r) => r.comment_id));
const registeredNames = dict.map((m) => m.name);

// 미등록 글의 원문만, 중복 제거
const seen = new Set();
const unknownTexts = [];
for (const p of allPosts) {
  if (matchedIds.has(p.id)) continue;
  const t = (p.text || '').trim();
  if (t.length < 3 || seen.has(t)) continue;
  seen.add(t);
  unknownTexts.push(t);
}
console.log(`[discover] 미등록 원문 ${unknownTexts.length}개 (등록밈 매칭 ${matchedIds.size}건 제외)`);

const sample = unknownTexts.slice(0, MAX_POSTS);
if (sample.length < unknownTexts.length) {
  console.log(`[discover] ⚠️ 비용 제어로 상위 ${sample.length}개만 하이쿠에 전송 (전체 ${unknownTexts.length}개)`);
}

// ── 3) 배치로 하이쿠 판별 ──
const found = [];
for (let i = 0; i < sample.length; i += BATCH) {
  const batch = sample.slice(i, i + BATCH);
  console.log(`[discover] 하이쿠 판별 ${i + 1}~${i + batch.length} / ${sample.length}...`);
  found.push(...(await askHaiku(batch, registeredNames)));
}

// ── 4) term 기준 중복 병합 → 확신도순 출력 ──
const byTerm = new Map();
for (const c of found) {
  const term = String(c.term || '').trim();
  if (!term) continue;
  const prev = byTerm.get(term);
  if (!prev || (c.confidence || 0) > (prev.confidence || 0)) byTerm.set(term, c);
}
const result = [...byTerm.values()].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

console.log(`\n===== 발굴 후보 ${result.length}건 (저장 안 함 · 눈으로 확인용) =====`);
for (const c of result) {
  console.log(`\n[${c.confidence ?? '?'}] ${c.term}`);
  console.log(`   뜻: ${c.meaning || '불명'}`);
  console.log(`   근거: ${String(c.evidence || '').slice(0, 80)}`);
}
console.log(`\n[discover] 종료 (크롤 ${allPosts.length} · 미등록 ${unknownTexts.length} · 전송 ${sample.length} · 후보 ${result.length})`);
process.exit(0);
