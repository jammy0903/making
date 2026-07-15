// 크롤 공용 HTTP — 타임아웃·재시도·"진짜 원인" 노출.
// undici fetch는 실패 시 message가 "fetch failed"뿐이고 실제 원인(ETIMEDOUT/ECONNRESET/DNS…)은
// err.cause에 숨는다. reason()으로 그걸 펴서 로그가 진단 가능하게 한다.

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

// undici의 "fetch failed" 껍데기를 벗겨 원인 코드를 드러낸다.
export function reason(err) {
  if (err?.status) return `HTTP ${err.status}`;
  return err?.cause?.code || err?.cause?.message || err?.name || err?.message || 'unknown';
}

// 타임아웃 + 지수백오프 재시도 fetch. 성공 시 Response 반환, 최종 실패 시 throw.
// 4xx(429 제외)는 봇차단·차단코드라 재시도 무의미 → 즉시 throw(상태 포함).
async function fetchWithRetry(url, { headers, timeout = 12000, retries = 2, retryDelay = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) {
        const e = new Error(`HTTP ${res.status}`);
        e.status = res.status;
        throw e;
      }
      return res;
    } catch (err) {
      lastErr = err;
      // 봇차단류(4xx, 429 제외)는 재시도해도 동일 → 중단
      if (err.status && err.status < 500 && err.status !== 429) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function fetchText(url, opts) {
  const res = await fetchWithRetry(url, opts);
  return res.text();
}

export async function fetchJson(url, opts) {
  const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' }, ...opts });
  return res.json();
}
