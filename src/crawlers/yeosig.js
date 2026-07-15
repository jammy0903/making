// 여성시대 크롤러

import { fetchText, reason } from './http.js';

const SOURCE = 'yeosig';
const URLS = [
  'https://www.yeosig.com/board/best?page=1',
  'https://www.yeosig.com/board/best?page=2',
  'https://www.yeosig.com/board/best?page=3',
];

export async function crawl() {
  const posts = [];

  for (const url of URLS) {
    try {
      const html = await fetchText(url);
      posts.push(...parseHtml(html));
    } catch (err) {
      console.error(`[여시] 크롤링 실패 ${url}: ${reason(err)}`);
    }
  }

  return posts;
}

function parseHtml(html) {
  const posts = [];

  const patterns = [
    /<a[^>]+class="[^"]*subject[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
    /<td\s+class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/g,
    /<div\s+class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/g,
    /<h[23][^>]*>\s*<a[^>]+href="[^"]*board[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
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

      if (title && title.length > 2 && !title.includes('공지') && !title.includes('광고')) {
        posts.push({
          text: title,
          source: SOURCE,
          timestamp: Date.now(),
          url: 'https://www.yeosig.com',
        });
      }
    }
  }

  return posts;
}

export const source = SOURCE;
