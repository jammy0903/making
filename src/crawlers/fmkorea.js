// 에펨코리아 크롤러

const SOURCE = 'fmkorea';
const URLS = [
  'https://www.fmkorea.com/index.php?mid=best&page=1',
  'https://www.fmkorea.com/index.php?mid=best&page=2',
  'https://www.fmkorea.com/index.php?mid=best&page=3',
  'https://www.fmkorea.com/index.php?mid=humor&page=1',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

export async function crawl() {
  const posts = [];

  for (const url of URLS) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) continue;

      const html = await response.text();
      const extracted = parseHtml(html);
      posts.push(...extracted);
    } catch (err) {
      console.error(`[FM] 크롤링 실패 ${url}:`, err.message);
    }
  }

  return posts;
}

function parseHtml(html) {
  const posts = [];

  const patterns = [
    /<a[^>]+class="[^"]*hotdeal_var[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
    /<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/g,
    /<td\s+class="title"[^>]*>[\s\S]*?<a[^>]+href="[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/g,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      let title = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      if (title && title.length > 2 && !title.includes('공지')) {
        posts.push({
          text: title,
          source: SOURCE,
          timestamp: Date.now(),
          url: 'https://www.fmkorea.com',
        });
      }
    }
  }

  return posts;
}

export const source = SOURCE;
