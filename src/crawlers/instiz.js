// 인스티즈 크롤러

import { fetchText, reason } from './http.js';

const SOURCE = 'instiz';
const URLS = [
  'https://www.instiz.net/pt?page=1',
  'https://www.instiz.net/pt?page=2',
  'https://www.instiz.net/pt?page=3',
  'https://www.instiz.net/pt?category=1&page=1',
];

export async function crawl() {
  const posts = [];

  for (const url of URLS) {
    try {
      const html = await fetchText(url);
      posts.push(...parseHtml(html));
    } catch (err) {
      console.error(`[인스티즈] 크롤링 실패 ${url}: ${reason(err)}`);
    }
  }

  return posts;
}

function parseHtml(html) {
  const posts = [];

  const patterns = [
    /<a[^>]+class="[^"]*listsubject[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
    /<td\s+class="[^"]*listsubject[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/g,
    /<span\s+class="[^"]*subject[^"]*"[^>]*>([\s\S]*?)<\/span>/g,
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
          url: 'https://www.instiz.net',
        });
      }
    }
  }

  return posts;
}

export const source = SOURCE;
