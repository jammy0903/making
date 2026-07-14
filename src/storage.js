// 인메모리 스토리지 — 이제 설정·마지막 크롤 시각만 보관한다.
// 밈 언급량과 dedup(중복 방지)은 Supabase가 소유한다(mention_counts PK, meme_rankings 뷰).

const DEFAULT_SETTINGS = {
  crawlInterval: 180, // 유튜브 search.list 할당량(호출당 100 units) 고려한 기본 주기(분)
  sources: {
    dcinside: true,
    fmkorea: true,
    instiz: true,
    yeosig: true,
    youtube: true,
    pinterest: true,
    x: true,
  },
};

const store = {
  settings: { ...DEFAULT_SETTINGS },
  lastCrawl: null,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...store.settings };
}

export function saveSettings(settings) {
  store.settings = { ...store.settings, ...settings };
}

export function getLastCrawl() {
  return store.lastCrawl;
}

export function setLastCrawl(timestamp) {
  store.lastCrawl = timestamp;
}

export function clearData() {
  store.lastCrawl = null;
}
