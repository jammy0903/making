// YouTube 크롤러 (공식 YouTube Data API v3)
//
// 한국 인기급상승(trending) 영상의 제목 + 상위 댓글을 수집한다.
// 댓글이 밈 표현이 가장 많이 나오는 곳이라 제목과 함께 모은다.
//
// 필요 환경변수: youtube_data_api_key (Google Cloud → YouTube Data API v3 키)
//   (대문자 YOUTUBE_API_KEY 도 지원)

const SOURCE = 'youtube';
const API = 'https://www.googleapis.com/youtube/v3';

const REGION = 'KR';
const TRENDING_COUNT = 50;     // 인기급상승 영상 개수 (videos.list maxResults 최대 50)
const COMMENT_VIDEO_COUNT = 15; // 댓글을 수집할 상위 영상 수
const COMMENTS_PER_VIDEO = 20;  // 영상당 상위 댓글 수
const MAX_COMMENT_LEN = 200;    // 긴 댓글은 잘라서 밈 표현에 집중

export async function crawl() {
  const apiKey = process.env.youtube_data_api_key || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[YouTube] youtube_data_api_key 미설정 — 건너뜀');
    return [];
  }

  const posts = [];

  // 1) 인기급상승 영상 → 제목 수집
  let videos = [];
  try {
    const url =
      `${API}/videos?part=snippet&chart=mostPopular&regionCode=${REGION}` +
      `&maxResults=${TRENDING_COUNT}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[YouTube] 인기영상 조회 실패: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    videos = data.items || [];

    for (const v of videos) {
      const title = (v.snippet?.title || '').trim();
      if (title.length > 2) {
        posts.push({
          text: title,
          source: SOURCE,
          timestamp: Date.now(),
          url: `https://www.youtube.com/watch?v=${v.id}`,
        });
      }
    }
  } catch (err) {
    console.error('[YouTube] 인기영상 크롤링 실패:', err.message);
    return posts;
  }

  // 2) 상위 영상들의 상위 댓글 수집 (댓글 = 밈 밀집 지역)
  const targets = videos.slice(0, COMMENT_VIDEO_COUNT);
  await Promise.all(
    targets.map(async (v) => {
      try {
        const url =
          `${API}/commentThreads?part=snippet&videoId=${v.id}&order=relevance` +
          `&maxResults=${COMMENTS_PER_VIDEO}&textFormat=plainText&key=${apiKey}`;
        const res = await fetch(url);
        // 댓글 비활성화된 영상은 403 — 조용히 건너뜀
        if (!res.ok) return;

        const data = await res.json();
        for (const item of data.items || []) {
          let text = item.snippet?.topLevelComment?.snippet?.textDisplay || '';
          text = text.replace(/\s+/g, ' ').trim();
          if (text.length > MAX_COMMENT_LEN) text = text.substring(0, MAX_COMMENT_LEN);
          if (text.length > 2) {
            posts.push({
              text,
              source: SOURCE,
              timestamp: Date.now(),
              url: `https://www.youtube.com/watch?v=${v.id}`,
            });
          }
        }
      } catch (err) {
        console.error(`[YouTube] 댓글 크롤링 실패 (${v.id}):`, err.message);
      }
    })
  );

  return posts;
}

export const source = SOURCE;
