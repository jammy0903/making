import type { LayoutServerLoad } from './$types';

// 감지된 로케일을 클라이언트로 전달 (레이아웃에서 컨텍스트로 주입)
export const load: LayoutServerLoad = ({ locals }) => ({ locale: locals.locale });
