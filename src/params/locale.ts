import type { ParamMatcher } from '@sveltejs/kit';

// [[lang=locale]] 옵셔널 파라미터 매처: en, zh 만 로케일 prefix 로 인식. ko 는 prefix 없음(루트).
export const match: ParamMatcher = (param) => param === 'en' || param === 'zh';
