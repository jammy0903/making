// 인메모리 스토리지 (B단계 로컬 검증용 — 재시작 시 초기화됨).
// dedup의 진짜 영속성(재시작 후에도 "본 댓글" 기억)은 D단계 Supabase comment_id UNIQUE에서 완성.

const DEFAULT_SETTINGS = {
  crawlInterval: 180, // 유튜브 search.list 할당량(호출당 100 units) 고려한 기본 주기(분)
  sources: {
    dcinside: true,
    fmkorea: true,
    instiz: true,
    yeosig: true,
    youtube: true,
  },
};

const store = {
  settings: { ...DEFAULT_SETTINGS },
  seen: new Set(),     // 이미 센 댓글 id — 중복 카운트 방지
  mentions: new Map(), // memeId → { name, count } 누적 언급량
  lastCrawl: null,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...store.settings };
}

export function saveSettings(settings) {
  store.settings = { ...store.settings, ...settings };
}

// dedup용 seen 셋 (matchComments에 그대로 넘겨 신규 댓글만 카운트)
export function getSeen() {
  return store.seen;
}

// 이번 크롤의 밈별 카운트를 누적 언급량에 더한다.
export function addMentions(counts) {
  for (const { memeId, name, count } of counts) {
    const prev = store.mentions.get(memeId);
    store.mentions.set(memeId, { name, count: (prev?.count || 0) + count });
  }
}

// 누적 언급 랭킹 (count 내림차순)
export function getMentions() {
  return [...store.mentions.entries()]
    .map(([memeId, { name, count }]) => ({ memeId, name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getLastCrawl() {
  return store.lastCrawl;
}

export function setLastCrawl(timestamp) {
  store.lastCrawl = timestamp;
}

export function clearData() {
  store.seen.clear();
  store.mentions.clear();
  store.lastCrawl = null;
}
