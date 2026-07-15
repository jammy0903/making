// DC인사이드 핫갤 크롤러

import { fetchText, reason } from './http.js';

const SOURCE = 'dcinside';
const URLS = [
  'https://gall.dcinside.com/board/lists/?id=hit&page=1',
  'https://gall.dcinside.com/board/lists/?id=hit&page=2',
  'https://gall.dcinside.com/board/lists/?id=hit&page=3',
];

export async function crawl() {
  const posts = [];

  for (const url of URLS) {
    try {
      const html = await fetchText(url);
      posts.push(...parseHtml(html));
    } catch (err) {
      console.error(`[DC] 크롤링 실패 ${url}: ${reason(err)}`);
    }
  }

  return posts;
}

function parseHtml(html) {
  const posts = [];

  const titleRegex =
    /<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a[^>]+href="[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/g;
  let match;

  while ((match = titleRegex.exec(html)) !== null) {
    let title = match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (title && title.length > 2 && !title.includes('설문') && !title.includes('공지')) {
      posts.push({
        text: title,
        source: SOURCE,
        timestamp: Date.now(),
        url: 'https://gall.dcinside.com',
      });
    }
  }

  return posts;
}

export const source = SOURCE;
