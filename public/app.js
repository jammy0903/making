// 밈 레이더 - 웹앱 프론트엔드

const feed = document.getElementById('feed');
const btnRefresh = document.getElementById('btn-refresh');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const settingsOverlay = document.getElementById('settings-overlay');
const trendCount = document.getElementById('trend-count');
const lastUpdateEl = document.getElementById('last-update');

const SOURCE_NAMES = {
  dcinside: 'DC인사이드',
  fmkorea: '에펨코리아',
  instiz: '인스티즈',
  yeosig: '여성시대',
  youtube: '유튜브',
};

// ─── 초기 로드 ───────────────────────────────────

init();

async function init() {
  await loadTrends();
  await loadStatus();
}

async function loadTrends() {
  try {
    const res = await fetch('/api/trends');
    const data = await res.json();
    renderFeed(data.trends || []);
  } catch (err) {
    console.error('트렌드 로드 실패:', err);
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <p>데이터를 불러올 수 없습니다.<br>새로고침을 눌러주세요.</p>
      </div>`;
  }
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.lastCrawl) {
      lastUpdateEl.textContent = getTimeAgo(data.lastCrawl) + ' 업데이트';
    }
  } catch {
    // ignore
  }
}

// ─── 피드 렌더링 ─────────────────────────────────

function renderFeed(trends) {
  if (!trends || trends.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📡</div>
        <p>아직 수집된 밈이 없습니다.<br>새로고침 버튼을 눌러 크롤링을 시작하세요!</p>
      </div>`;
    trendCount.textContent = '';
    return;
  }

  trendCount.textContent = trends.length;
  feed.innerHTML = '';

  trends.forEach((trend, index) => {
    const card = createCard(trend, index);
    feed.appendChild(card);
  });
}

function createCard(trend, index) {
  const card = document.createElement('div');
  card.className = 'meme-card';

  const sourceTags = trend.sources
    .map(
      (s) =>
        `<span class="source-tag tag-${s}">${SOURCE_NAMES[s] || s}</span>`
    )
    .join('');

  const samples = trend.samples
    .map((s) => `<div class="sample-item">"${escapeHtml(s)}"</div>`)
    .join('');

  const typeLabel =
    trend.type === 'sentence' ? '문장 반복' :
    trend.type === 'keyword_pattern' ? '키워드 패턴' : '부분문자열';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-rank">#${index + 1}</span>
      <span class="card-score">점수 ${trend.score}</span>
    </div>
    <div class="card-phrase">${escapeHtml(trend.phrase)}</div>
    <div class="card-meta">
      <span class="meta-item">${trend.count}회 등장</span>
      <span class="meta-item">${trend.sourceCount}개 커뮤니티</span>
      <span class="meta-item">${typeLabel}</span>
    </div>
    <div class="card-sources">${sourceTags}</div>
    ${samples ? `<details class="card-samples"><summary>사용 예시 보기</summary><div class="sample-list">${samples}</div></details>` : ''}
  `;

  return card;
}

// ─── 새로고침 ────────────────────────────────────

btnRefresh.addEventListener('click', async () => {
  btnRefresh.classList.add('spinning');
  feed.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>커뮤니티 크롤링 중...</p>
    </div>`;

  try {
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    renderFeed(data.trends || []);
    await loadStatus();
  } catch (err) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>크롤링 중 오류 발생<br>${escapeHtml(err.message)}</p>
      </div>`;
  }

  btnRefresh.classList.remove('spinning');
});

// ─── 설정 모달 ───────────────────────────────────

btnSettings.addEventListener('click', () => {
  settingsOverlay.classList.remove('hidden');
  loadSettingsForm();
});

btnCloseSettings.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings();
});

function closeSettings() {
  settingsOverlay.classList.add('hidden');
}

async function loadSettingsForm() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const s = data.settings;

    document.getElementById('crawl-interval').value = String(s.crawlInterval || 30);

    const sources = s.sources || {};
    document.getElementById('src-dcinside').checked = sources.dcinside !== false;
    document.getElementById('src-fmkorea').checked = sources.fmkorea !== false;
    document.getElementById('src-instiz').checked = sources.instiz !== false;
    document.getElementById('src-yeosig').checked = sources.yeosig !== false;
    document.getElementById('src-youtube').checked = sources.youtube !== false;
  } catch (err) {
    console.error('설정 로드 실패:', err);
  }
}

document.getElementById('btn-save').addEventListener('click', async () => {
  const settings = {
    crawlInterval: parseInt(document.getElementById('crawl-interval').value),
    sources: {
      dcinside: document.getElementById('src-dcinside').checked,
      fmkorea: document.getElementById('src-fmkorea').checked,
      instiz: document.getElementById('src-instiz').checked,
      yeosig: document.getElementById('src-yeosig').checked,
      youtube: document.getElementById('src-youtube').checked,
    },
    maxDays: 3,
  };

  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });

    const status = document.getElementById('save-status');
    status.textContent = '저장됨!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch (err) {
    console.error('설정 저장 실패:', err);
  }
});

document.getElementById('btn-clear').addEventListener('click', async () => {
  if (!confirm('수집된 모든 데이터를 삭제하시겠습니까?')) return;

  await fetch('/api/clear-data', { method: 'POST' });
  const status = document.getElementById('save-status');
  status.textContent = '데이터 초기화됨';
  setTimeout(() => { status.textContent = ''; }, 2000);
  renderFeed([]);
});

// ─── 유틸 ────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
