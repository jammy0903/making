// 에펨코리아 크롤러

import { fetchText, reason } from './http.js';

const SOURCE = 'fmkorea';
const URLS = [
  'https://www.fmkorea.com/index.php?mid=best&page=1',
  'https://www.fmkorea.com/index.php?mid=best&page=2',
  'https://www.fmkorea.com/index.php?mid=best&page=3',
  'https://www.fmkorea.com/index.php?mid=humor&page=1',
];

export async function crawl() {
  const posts = [];

  for (const url of URLS) {
    try {
      const html = await fetchText(url);
      posts.push(...parseHtml(html));
    } catch (err) {
      console.error(`[FM] 크롤링 실패 ${url}: ${reason(err)}`);
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
