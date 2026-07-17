// Supabase REST(PostgREST) 클라이언트 — 의존성 없이 fetch + service role 키.
// service role 키는 RLS를 우회하므로 서버(크롤러)에서만 사용한다. 프론트엔드엔 노출 금지.

const URL = process.env.PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isConfigured = Boolean(URL && KEY);

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// 밈 사전 로드 (매칭에 쓸 등록 밈 + 키워드)
export async function fetchMemes() {
  if (!isConfigured) {
    console.error('[supabase] SUPABASE 환경변수 미설정 — 밈 사전 로드 불가');
    return [];
  }
  const res = await fetch(`${URL}/rest/v1/memes?select=id,name,keywords&order=id`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`fetchMemes ${res.status}: ${await res.text()}`);
  return res.json();
}

// 스테디 밈만 로드 (핀터레스트 검색어 생성용 — name/keywords).
// status 컬럼이 없거나 DB 미연결이면 throw → 호출측이 폴백 검색어로 넘어간다.
// 크롤러가 DB에 매달리지 않도록 5초 타임아웃.
export async function fetchSteadyMemes() {
  if (!isConfigured) return [];
  const res = await fetch(
    `${URL}/rest/v1/memes?select=name,keywords&status=eq.steady&order=id`,
    { headers: headers(), signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`fetchSteadyMemes ${res.status}: ${await res.text()}`);
  return res.json();
}

// 언급 행 삽입. PK(meme_id, comment_id) 충돌은 무시(=dedup).
// 반환: 실제로 새로 삽입된 행 배열(이미 센 댓글은 제외되어 안 옴).
export async function insertMentions(rows) {
  if (!isConfigured || rows.length === 0) return [];
  const res = await fetch(`${URL}/rest/v1/mention_counts`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insertMentions ${res.status}: ${await res.text()}`);
  return res.json();
}

// 일자 지표 값 upsert (네이버 트렌드/블로그/카페). PK(meme_id, comment_id) 충돌 시 갱신.
// rows: { meme_id, comment_id:'source:날짜', source, hour_bucket, day_bucket, value }
export async function upsertMetrics(rows) {
  if (!isConfigured || rows.length === 0) return 0;
  const res = await fetch(`${URL}/rest/v1/mention_counts`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsertMetrics ${res.status}: ${await res.text()}`);
  return rows.length;
}

// 신상 밈 후보 삽입. url UNIQUE 충돌은 무시. 반환: 새로 들어간 행(중복 제외).
export async function insertCandidates(rows) {
  if (!isConfigured || rows.length === 0) return [];
  const res = await fetch(`${URL}/rest/v1/discovery_candidates`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insertCandidates ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── 발굴(discovery) Phase 0 — docs/discovery-plan.md ──

// 크롤 원문 삽입. post_id UNIQUE 충돌은 무시. 반환: 새로 들어간 행(=처음 보는 원문).
// ignore-duplicates는 기본이 PK(id) 기준이라 on_conflict=post_id 명시 필수.
export async function insertRawTexts(rows) {
  if (!isConfigured || rows.length === 0) return [];
  const res = await fetch(`${URL}/rest/v1/raw_texts?on_conflict=post_id`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insertRawTexts ${res.status}: ${await res.text()}`);
  return res.json();
}

// n-gram 일별 카운트 가산 upsert (RPC bump_ngram_daily — 충돌 시 count를 더함)
export async function bumpNgramDaily(rows) {
  if (!isConfigured || rows.length === 0) return 0;
  const res = await fetch(`${URL}/rest/v1/rpc/bump_ngram_daily`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`bumpNgramDaily ${res.status}: ${await res.text()}`);
  return rows.length;
}

// 사람이 반려한 후보 용어 목록 (누적 시 제외용)
export async function fetchRejectedTerms() {
  if (!isConfigured) return [];
  const res = await fetch(`${URL}/rest/v1/rejected_terms?select=term`, { headers: headers() });
  if (!res.ok) throw new Error(`fetchRejectedTerms ${res.status}: ${await res.text()}`);
  return (await res.json()).map((r) => r.term);
}

// 보존 기간 밖 데이터 삭제 (raw_texts / ngram_daily)
export async function cleanupDiscovery(rawDays, ngramDays) {
  if (!isConfigured) return;
  const cutoff = (d) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);
  for (const [table, days] of [['raw_texts', rawDays], ['ngram_daily', ngramDays]]) {
    const res = await fetch(`${URL}/rest/v1/${table}?day=lt.${cutoff(days)}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error(`cleanupDiscovery(${table}) ${res.status}: ${await res.text()}`);
  }
}

// 오늘(KST) 순위 스냅샷 적재 (RPC snapshot_ranking — db/rank_snapshots.sql).
// 같은 날 재실행하면 갱신(멱등). 반환: 적재된 행 수.
export async function snapshotRanking() {
  if (!isConfigured) return 0;
  const res = await fetch(`${URL}/rest/v1/rpc/snapshot_ranking`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`snapshotRanking ${res.status}: ${await res.text()}`);
  return res.json();
}

// 밈별 누적 언급량 랭킹 (뷰 meme_rankings)
export async function fetchRankings() {
  if (!isConfigured) return [];
  const res = await fetch(
    `${URL}/rest/v1/meme_rankings?select=meme_id,name,mentions&order=mentions.desc`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`fetchRankings ${res.status}: ${await res.text()}`);
  return res.json();
}
