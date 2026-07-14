// YouTube 크롤러 (공식 YouTube Data API v3)
//
// 주제별로 최근(7일 내) 화제 영상을 1개씩 골라 그 댓글만 수집한다.
// 제목은 밈 신호가 약해 제외하고, 밈이 몰리는 댓글만 모은다.
// 유튜브 고정 카테고리는 정치/뉴스·드라마/문화가 겹쳐 주제 분리가 안 되므로
// 카테고리 대신 주제별 "검색어"로 영상을 고른다.
//
// 필요 환경변수: youtube_data_api_key (Google Cloud → YouTube Data API v3 키)
//   (대문자 YOUTUBE_API_KEY 도 지원)
//
// ⚠️ 할당량: search.list = 호출당 100 units. 주제 N개면 크롤 1회에 약 N×100 units.
//    기본 일일 할당량 10,000 units 기준, 주제 수와 크롤 주기를 고려할 것.

const SOURCE = 'youtube';
const API = 'https://www.googleapis.com/youtube/v3';

const REGION = 'KR';
const COMMENTS_PER_VIDEO = 50;  // 주제별 영상 1개에서 수집할 댓글 수
const MAX_COMMENT_LEN = 200;    // 긴 댓글은 잘라서 밈 표현에 집중
const RECENT_DAYS = 7;          // 최근 며칠 내 영상만 화제 후보로

// 주제별 검색어 — 각 주제에서 최근 조회수 1위 영상을 골라 댓글 수집.
// 항목을 추가/수정하면 주제가 늘거나 바뀐다 (할당량 주의).
const TOPICS = [
  { key: 'idol', label: '아이돌', q: '아이돌' },
  { key: 'sports', label: '운동', q: '스포츠 운동' },
  { key: 'drama', label: '드라마', q: '드라마' },
  { key: 'politics', label: '정치', q: '정치' },
  { key: 'culture', label: '문화', q: '문화 예술' },
  { key: 'news', label: '뉴스', q: '뉴스' },
  { key: 'humor', label: '유머', q: '유머 웃긴영상' },
  { key: 'knowledge', label: '지식', q: '지식 상식' },
  { key: 'game', label: '게임', q: '게임' },
  { key: 'mukbang', label: '먹방', q: '먹방' },
];

// 한국어 비율이 낮은(영문·일문 등) 텍스트 제외 — 한국 밈 탐지에 노이즈
function isKorean(text) {
  const kr = (text.match(/[가-힣]/g) || []).length;
  const letters = (text.match(/[가-힣a-zA-Zぁ-んァ-ヶ一-龥]/g) || []).length;
  return letters > 0 && kr / letters >= 0.3;
}

// 한 주제에서 최근 화제 영상 1개를 찾아 댓글을 수집
async function crawlTopic(topic, apiKey, publishedAfter) {
  // 1) 주제별 최근 조회수 1위 영상 검색
  const searchUrl =
    `${API}/search?part=id&type=video&order=viewCount` +
    `&q=${encodeURIComponent(topic.q)}&regionCode=${REGION}&relevanceLanguage=ko` +
    `&publishedAfter=${publishedAfter}&maxResults=1&key=${apiKey}`;

  const sRes = await fetch(searchUrl);
  if (!sRes.ok) {
    console.error(`[YouTube] ${topic.label} 검색 실패: ${sRes.status} ${sRes.statusText}`);
    return [];
  }
  const sData = await sRes.json();
  const videoId = sData.items?.[0]?.id?.videoId;
  if (!videoId) {
    console.error(`[YouTube] ${topic.label} 화제 영상 없음`);
    return [];
  }

  // 2) 그 영상의 상위 댓글 50개
  const cUrl =
    `${API}/commentThreads?part=snippet&videoId=${videoId}&order=relevance` +
    `&maxResults=${COMMENTS_PER_VIDEO}&textFormat=plainText&key=${apiKey}`;

  const cRes = await fetch(cUrl);
  // 댓글 비활성화된 영상은 403 — 조용히 건너뜀
  if (!cRes.ok) {
    console.error(`[YouTube] ${topic.label} 댓글 조회 실패: ${cRes.status} (${videoId})`);
    return [];
  }
  const cData = await cRes.json();

  const posts = [];
  for (const item of cData.items || []) {
    let text = item.snippet?.topLevelComment?.snippet?.textDisplay || '';
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > MAX_COMMENT_LEN) text = text.substring(0, MAX_COMMENT_LEN);
    if (text.length > 2 && isKorean(text)) {
      posts.push({
        text,
        source: SOURCE,
        topic: topic.key,
        timestamp: Date.now(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }
  console.log(`[YouTube] ${topic.label}: ${videoId} 댓글 ${posts.length}개`);
  return posts;
}

export async function crawl() {
  const apiKey = process.env.youtube_data_api_key || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[YouTube] youtube_data_api_key 미설정 — 건너뜀');
    return [];
  }

  const publishedAfter = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 주제별로 병렬 수집 (한 주제가 실패해도 나머지는 계속)
  const results = await Promise.all(
    TOPICS.map((topic) =>
      crawlTopic(topic, apiKey, publishedAfter).catch((err) => {
        console.error(`[YouTube] ${topic.label} 크롤링 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}

export const source = SOURCE;
