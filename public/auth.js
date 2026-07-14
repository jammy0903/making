// 공유 Supabase Auth (Google 암시적 OAuth). index/admin 공용 — 단일 세션.
// config.js(window.__SB__) 다음에 로드. 로드 즉시 OAuth 콜백 해시를 처리한다.
(function () {
  const SB = window.__SB__ || { url: '', key: '' };
  const KEY = 'mmd-token';

  function saveHashToken() {
    if (!location.hash.includes('access_token')) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const at = p.get('access_token');
    if (at) {
      localStorage.setItem(KEY, JSON.stringify({ at, exp: Date.now() + Number(p.get('expires_in') || 3600) * 1000 }));
      history.replaceState(null, '', location.pathname);
    }
  }
  function token() {
    try { const t = JSON.parse(localStorage.getItem(KEY) || 'null'); if (t && t.exp > Date.now() + 5000) return t.at; } catch (e) {}
    return null;
  }
  function login() {
    location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
  }
  function logout() { localStorage.removeItem(KEY); location.reload(); }
  async function whoami() {
    if (!token()) return null;
    const r = await fetch(`${SB.url}/auth/v1/user`, { headers: { apikey: SB.key, Authorization: `Bearer ${token()}` } });
    return r.ok ? r.json() : null;
  }
  // 로그인 apikey는 anon, Authorization은 로그인 시 유저 토큰(아니면 anon)
  function headers(extra) {
    return { apikey: SB.key, Authorization: `Bearer ${token() || SB.key}`, ...extra };
  }

  saveHashToken(); // 콜백(#access_token) 즉시 처리
  window.mmdAuth = { token, login, logout, whoami, headers };
})();
