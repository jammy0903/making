/**
 * 경량 i18n (의존성 없음).
 * - 서버에서 로케일 감지(hooks.server.ts) → 레이아웃 data 로 전달 → 컨텍스트로 주입.
 * - 로케일은 페이지 로드마다 고정(전환 시 쿠키 저장 후 새로고침) → SSR 안전, 리액티브 스토어 불필요.
 */
import { getContext, setContext } from 'svelte';
import { messages, type MessageKey } from './messages';

export const locales = ['ko', 'en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';
export const localeNames: Record<Locale, string> = { ko: '한국어', en: 'English', zh: '中文' };

/** 키 → 번역. 없으면 기본 로케일 → 키 자체로 폴백. {var} 치환 지원. */
export function translate(
	locale: Locale,
	key: MessageKey,
	vars?: Record<string, string | number>
): string {
	const dict = messages[locale] ?? messages[defaultLocale];
	let s = dict[key] ?? messages[defaultLocale][key];
	if (s === undefined) {
		// 누락을 조용히 삼키지 않는다: 경고 후 키 문자열로 폴백
		console.warn(`[i18n] 누락된 번역 키: "${key}" (locale=${locale})`);
		return key;
	}
	if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
	return s;
}

const CTX = Symbol('locale');
export function setLocaleContext(locale: Locale): void {
	setContext(CTX, locale);
}
export function getLocale(): Locale {
	return (getContext(CTX) as Locale) ?? defaultLocale;
}
/** 컴포넌트에서: const t = useT(); t('key', {n: 3}) */
export function useT() {
	const l = getLocale();
	return (key: MessageKey, vars?: Record<string, string | number>) => translate(l, key, vars);
}

/** 경로에 로케일 prefix 를 붙인다. ko(기본)는 prefix 없음, en/zh 는 /en /zh. */
export function localePath(locale: Locale, path: string): string {
	const p = path.startsWith('/') ? path : `/${path}`;
	return locale === defaultLocale ? p : `/${locale}${p}`;
}

/** pathname 에서 로케일 prefix 와 나머지 순수 경로를 분리. */
export function splitLocale(pathname: string): { locale: Locale; rest: string } {
	const seg = pathname.split('/')[1];
	// 기본 로케일(ko)은 prefix 없음. 나머지 로케일만 URL prefix 로 인식(locales 에서 유도).
	if (seg && seg !== defaultLocale && (locales as readonly string[]).includes(seg)) {
		const rest = pathname.slice(seg.length + 1);
		return { locale: seg as Locale, rest: rest || '/' };
	}
	return { locale: defaultLocale, rest: pathname || '/' };
}

/** Accept-Language(우선) + IP 국가(보정)로 로케일 결정. US→en, CN→zh, KR→ko, 그 외→en. */
export function pickLocale(acceptLanguage: string | null, country?: string | null): Locale {
	const al = (acceptLanguage ?? '').toLowerCase();
	// Accept-Language 의 첫 언어 태그로 판단(locales 에서 유도)
	const first = al.split(',')[0]?.trim() ?? '';
	for (const l of locales) if (first.startsWith(l)) return l;
	// 브라우저 언어로 못 정하면 IP 국가로 보정
	const c = (country ?? '').toUpperCase();
	if (c === 'CN' || c === 'TW' || c === 'HK' || c === 'SG') return 'zh';
	if (c === 'KR') return 'ko';
	if (c === 'US' || c === 'GB' || c === 'CA' || c === 'AU') return 'en';
	// 알 수 없는 외국어 방문자는 영어, 정보가 아예 없으면 기본(한국어)
	if (first) return 'en';
	return defaultLocale;
}

/**
 * 받침 유무로 은/는 조사 선택(한글 끝음절 기준). 한글이 아니면 '은' 폴백.
 * 예) "토마토" → "는", "물" → "은". 결과 영수증의 "…은/는 못해" 등에 공용.
 */
export function josaEunNeun(word: string): string {
	const c = word.charCodeAt(word.length - 1);
	if (c < 0xac00 || c > 0xd7a3) return '은';
	return (c - 0xac00) % 28 === 0 ? '는' : '은';
}
