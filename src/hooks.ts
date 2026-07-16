// 유니버설 reroute: /en/... 요청을 무접두 라우트로 되돌려 SvelteKit이 매칭하게 함.
// (locale 자체는 paraglide가 URL에서 읽음)
import { deLocalizeUrl } from '$lib/paraglide/runtime';
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
