// SvelteKit 설정 — 스트랭글러 이전(docs/architecture.md Phase 1~2).
// 기존 정적 SPA(public/)와 Express(server.js)는 파리티 도달까지 병행 유지.
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  // regions: 서버 함수를 서울(icn1)에서 실행 — Supabase가 서울 리전이라 함께 둬야 한다.
  // 기본값(iad1, 미국 동부)이면 SSR 한 번에 태평양을 왕복해(함수→DB→함수) 캐시 미스가
  // 실측 ~0.9~1.4s였다. 엣지(icn1)는 원래 서울이라 캐시 히트는 이미 빨랐고, 느린 건
  // 미스 때 도는 DB 왕복이었다.
  kit: { adapter: adapter({ regions: ['icn1'] }) },
};

export default config;
