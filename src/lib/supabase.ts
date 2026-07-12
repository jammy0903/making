/**
 * Supabase 연결 + 익명 플레이 로그(B-2 상위 N%).
 * 환경변수 미설정이거나 네트워크 실패 시 조용히 null 반환 → 기능만 꺼지고 게임은 정상.
 * 저장은 덱ID·선택배열·랜덤 세션id·파생 캐시(선호편/버틴깊이)만. 접속 메타데이터 미수집(자문 B-5).
 */
import { env } from '$env/dynamic/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RoundResult, SideIndex } from './game/engine';

let client: SupabaseClient | null = null;
let tried = false;

function getSupabase(): SupabaseClient | null {
	if (tried) return client;
	tried = true;
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) return null;
	client = createClient(url, key, { auth: { persistSession: false } });
	return client;
}

const SESSION_KEY = 'geuronde_session';

/** 익명 세션 id(브라우저 localStorage의 uuid). 접속자 식별 아님, 통계용. */
function sessionId(): string {
	if (typeof localStorage === 'undefined') return '';
	let id = localStorage.getItem(SESSION_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(SESSION_KEY, id);
	}
	return id;
}

export interface PlayRank {
	/** 같은 덱·같은 선호편 중 내 버틴 깊이의 상위 % (깊을수록 상위, 1~100) */
	percentile: number;
	/** 표본 수(이 값이 작으면 화면에서 배지 숨김) */
	sample: number;
}

/**
 * 주제/조건 신청 접수. 성공하면 true.
 * @param kind 'topic'(새 주제) | 'condition'(조건 문구 제안)
 */
export async function submitRequest(
	kind: 'topic' | 'condition',
	title: string,
	body: string
): Promise<boolean> {
	const sb = getSupabase();
	if (!sb) return false;
	try {
		const { error } = await sb.rpc('submit_request', {
			p_kind: kind,
			p_title: title,
			p_body: body,
			p_session_id: sessionId()
		});
		if (error) {
			console.warn('[submitRequest]', error.message);
			return false;
		}
		return true;
	} catch (e) {
		console.warn('[submitRequest]', e);
		return false;
	}
}

/**
 * 완주한 플레이를 기록하고 상위 N%를 돌려받는다.
 * 실패(환경 미설정·네트워크·RLS)면 null → 결과 카드에서 배지만 숨기고 나머지는 그대로.
 */
export async function recordPlay(
	deckId: string,
	choices: SideIndex[],
	result: RoundResult
): Promise<PlayRank | null> {
	const sb = getSupabase();
	if (!sb) return null;
	try {
		const { data, error } = await sb.rpc('record_play', {
			p_deck_id: deckId,
			p_session_id: sessionId(),
			p_choices: choices,
			p_pref: result.pref,
			p_depth_a: result.holdMax[0],
			p_depth_b: result.holdMax[1]
		});
		if (error) {
			console.warn('[recordPlay]', error.message);
			return null;
		}
		return data as PlayRank;
	} catch (e) {
		console.warn('[recordPlay]', e);
		return null;
	}
}
