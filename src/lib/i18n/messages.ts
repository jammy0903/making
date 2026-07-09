import type { Locale } from './index';

/** UI 문구 사전. 키는 화면/영역별 그룹. {var} 는 실행 시 치환.
 *  랭킹게임 문구는 피벗으로 제거됨 — "그런데이제" 밸런스게임 화면 구현 시 키를 추가한다. */
export const messages = {
	ko: {
		'app.title': '그런데이제',
		'nav.home': '홈으로',
		'lang.label': '언어'
	},

	en: {
		'app.title': '그런데이제',
		'nav.home': 'Home',
		'lang.label': 'Language'
	},

	zh: {
		'app.title': '그런데이제',
		'nav.home': '首页',
		'lang.label': '语言'
	}
} satisfies Record<Locale, Record<string, string>>;

/** 모든 로케일이 가져야 할 번역 키(ko 를 원천으로). 호출부 `t('key')` 오타를 컴파일 타임에 차단. */
export type MessageKey = keyof (typeof messages)['ko'];

// en·zh 가 ko 와 같은 키 집합인지 컴파일 타임 검증: 누락 키가 있으면 아래 대입에서 타입 에러가 난다.
type _MissingKeys =
	| Exclude<MessageKey, keyof (typeof messages)['en']>
	| Exclude<MessageKey, keyof (typeof messages)['zh']>;
const _assertNoMissingKeys: [_MissingKeys] extends [never] ? true : _MissingKeys = true;
void _assertNoMissingKeys;
