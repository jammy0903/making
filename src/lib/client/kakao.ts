// 카카오톡 링크 카드 공유 — Web Share(파일 첨부)와 별개로, 채팅창에 제목·설명·썸네일이
// 뜨는 "카드형" 공유를 위해 카카오 SDK(Kakao.Share)를 쓴다.
// PUBLIC_KAKAO_JS_KEY 미설정 시 기능을 조용히 끈다(버튼 자체를 숨기는 건 호출측 책임).
import { env } from '$env/dynamic/public';

const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';

let ready: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    if ((window as any).Kakao) return resolve();
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('카카오 SDK 로드 실패'));
    document.head.appendChild(s);
  });
  return ready;
}

export function kakaoEnabled(): boolean {
  return Boolean(env.PUBLIC_KAKAO_JS_KEY);
}

async function ensureInit(): Promise<any> {
  const key = env.PUBLIC_KAKAO_JS_KEY;
  if (!key) throw new Error('PUBLIC_KAKAO_JS_KEY 미설정');
  await loadSdk();
  const Kakao = (window as any).Kakao;
  if (!Kakao.isInitialized()) Kakao.init(key);
  return Kakao;
}

export interface KakaoFeed {
  title: string;
  description: string;
  imageUrl: string; // 카카오 서버가 직접 fetch하므로 반드시 공개 URL(same-origin 상대경로 불가)
  path: string;      // 딥링크 경로 (예: '/era')
  buttonText: string;
}

// 실패해도 예외로 던지지 말고 조용히 넘어간다 — 버튼 자체가 선택적 부가 기능이라
// 실패 시 기존 Web Share/저장 흐름을 막을 이유가 없다(호출측이 catch해서 안내만).
export async function shareKakao(f: KakaoFeed): Promise<void> {
  const Kakao = await ensureInit();
  const url = `${location.origin}${f.path}`;
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: f.title,
      description: f.description,
      imageUrl: f.imageUrl,
      link: { webUrl: url, mobileWebUrl: url },
    },
    buttons: [
      { title: f.buttonText, link: { webUrl: url, mobileWebUrl: url } },
    ],
  });
}
