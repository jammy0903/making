import { defineConfig } from 'vitest/config';

// 순수 로직(순위 엔진 등) 단위 테스트용. SvelteKit 플러그인을 로드하지 않는다.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
