// 인메모리 스토리지 (chrome.storage 대체)

const DEFAULT_SETTINGS = {
  crawlInterval: 180, // 유튜브 search.list 할당량(호출당 100 units) 고려한 기본 주기(분)
  sources: {
    dcinside: true,
    fmkorea: true,
    instiz: true,
    yeosig: true,
    youtube: true,
  },
  maxDays: 3,
};

const store = {
  crawlData: [],
  trends: [],
  settings: { ...DEFAULT_SETTINGS },
  lastCrawl: null,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...store.settings };
}

export function saveSettings(settings) {
  store.settings = { ...store.settings, ...settings };
}

export function getCrawlData() {
  return store.crawlData;
}

export function saveCrawlData(data) {
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  store.crawlData = data.filter((d) => d.timestamp > threeDaysAgo);
}

export function getTrends() {
  return store.trends;
}

export function saveTrends(trends) {
  store.trends = trends;
}

export function getLastCrawl() {
  return store.lastCrawl;
}

export function setLastCrawl(timestamp) {
  store.lastCrawl = timestamp;
}

export function clearData() {
  store.crawlData = [];
  store.trends = [];
  store.lastCrawl = null;
}
