// SvelteKit 설정 — 스트랭글러 이전(docs/architecture.md Phase 1~2).
// 기존 정적 SPA(public/)와 Express(server.js)는 파리티 도달까지 병행 유지.
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
};

export default config;
