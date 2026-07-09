/** 서버 측 외부 요청용 공용 상수. */

/**
 * 외부(Bing 검색·이미지 프록시) 요청에 쓰는 브라우저 User-Agent.
 * 핫링크·봇 차단을 피하려 일반 크롬 UA 로 위장한다. 한 곳에서 관리해 불일치 방지.
 */
export const BROWSER_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
