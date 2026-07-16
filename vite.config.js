import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // i18n: 메시지 컴파일 → src/lib/paraglide. 기본 ko(무접두), en은 /en/ 경로.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      strategy: ['url', 'cookie', 'baseLocale'], // URL(/en/) 우선 → 쿠키 → 기본(ko)
    }),
    sveltekit(),
  ],
});
