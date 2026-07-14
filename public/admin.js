// memedics 관리자 — Supabase Auth(Google 암시적 OAuth) + 밈 등록/편집 + 후보 검토.
// 의존성 없이 REST 직접 호출. 방문자엔 RLS가 쓰기를 막고, 관리자 이메일만 통과.

const SB = window.__SB__ || { url: '', key: '' };
const ADMINS = ['jamm2ic@gmail.com', 'l89192164@gmail.com'];
const TKEY = 'mmd-admin-token';
const root = document.getElementById('admin');

// ─── 인증(암시적 OAuth) ───
function saveHashToken() {
  if (!location.hash.includes('access_token')) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const at = p.get('access_token');
  if (at) {
    localStorage.setItem(TKEY, JSON.stringify({ at, exp: Date.now() + Number(p.get('expires_in') || 3600) * 1000 }));
    history.replaceState(null, '', location.pathname);
  }
}
function token() {
  try { const t = JSON.parse(localStorage.getItem(TKEY) || 'null'); if (t && t.exp > Date.now() + 5000) return t.at; } catch (e) {}
  return null;
}
function login() {
  location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
}
function logout() { localStorage.removeItem(TKEY); state.user = null; render(); }

function h(extra) { return { apikey: SB.key, Authorization: `Bearer ${token()}`, ...extra }; }
async function api(path, opts = {}) {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, { ...opts, headers: h(opts.headers) });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
async function whoami() {
  const r = await fetch(`${SB.url}/auth/v1/user`, { headers: h() });
  return r.ok ? r.json() : null;
}

// ─── 상태 ───
const state = { user: null, checking: true, tab: 'candidates', candidates: [], memes: [], editing: null };
function set(p) { Object.assign(state, p); render(); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function val(id) { return document.getElementById(id).value.trim(); }
function arr(s) { return (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean); }

// ─── 데이터 ───
async function loadCandidates() {
  state.candidates = await api('discovery_candidates?status=eq.pending&select=id,title,url,source_type,found_at&order=found_at.desc&limit=100');
}
async function rejectCandidate(id) {
  await api(`discovery_candidates?id=eq.${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'rejected' }) });
}
const MEME_COLS = 'id,name,keywords,description,tags,category,status,source,photo_url';
async function loadMemes(q) {
  const filter = q ? `&name=ilike.*${encodeURIComponent(q)}*` : '';
  state.memes = await api(`memes?select=${MEME_COLS}&order=id.desc&limit=300${filter}`);
}
async function saveMeme(data, id) {
  const opts = { headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(data) };
  if (id) await api(`memes?id=eq.${id}`, { method: 'PATCH', ...opts });
  else await api('memes', { method: 'POST', ...opts });
}

// ─── 액션(전역 — 인라인 onclick용) ───
async function go(tab) {
  state.tab = tab; state.editing = null;
  try { tab === 'candidates' ? await loadCandidates() : await loadMemes(); } catch (e) {}
  render();
}
function startRegister(id) {
  const c = state.candidates.find((x) => x.id === id);
  set({ editing: { cand: c, meme: {} } });
}
async function doReject(id) {
  try { await rejectCandidate(id); state.candidates = state.candidates.filter((c) => c.id !== id); render(); }
  catch (e) { alert('반려 실패: ' + e.message); }
}
function editMeme(id) { set({ editing: { meme: state.memes.find((m) => m.id === id) } }); }
function newMeme() { set({ editing: { meme: {} } }); }
function cancelEdit() { state.editing = null; go(state.tab); }
async function searchMemes() { try { await loadMemes(val('meme-q')); } catch (e) {} render(); }
async function saveEdit() {
  const data = {
    name: val('f-name'), keywords: arr(val('f-keywords')), description: val('f-desc'),
    tags: arr(val('f-tags')), category: val('f-cat') || null, status: val('f-status'),
    source: val('f-src') || null, photo_url: val('f-photo') || null,
  };
  const msg = document.getElementById('save-msg'); msg.textContent = '저장 중…';
  try {
    if (state.editing.cand) {
      await saveMeme(data, null); // 새 밈 생성
      await api(`discovery_candidates?id=eq.${state.editing.cand.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'registered' }) });
      state.candidates = state.candidates.filter((c) => c.id !== state.editing.cand.id);
    } else {
      await saveMeme(data, state.editing.meme.id);
    }
    cancelEdit();
  } catch (e) { msg.textContent = '실패: ' + e.message; }
}

// ─── 렌더 ───
function shell(inner) {
  const who = state.user ? `${esc(state.user.email)} · <a href="#" onclick="logout();return false">로그아웃</a>` : '';
  const isAdmin = state.user && ADMINS.includes(state.user.email);
  const tabs = isAdmin && !state.editing ? `
    <div class="admin-tabs">
      <button class="${state.tab === 'candidates' ? 'on' : ''}" onclick="go('candidates')">후보 검토</button>
      <button class="${state.tab === 'memes' ? 'on' : ''}" onclick="go('memes')">밈 관리</button>
    </div>` : '';
  return `<div class="admin-wrap">
    <div class="admin-head"><h1>memedics · 관리자</h1><span style="font-size:13px;color:var(--mute)">${who}</span></div>
    ${tabs}${inner}</div>`;
}
function candidatesView() {
  if (!state.candidates.length) return `<div class="empty">대기 중인 후보가 없습니다.</div>`;
  return state.candidates.map((c) => `
    <div class="adm-row">
      <div class="t"><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a></div>
      <div class="m">${esc(c.source_type || '')} · ${esc((c.found_at || '').slice(0, 10))}</div>
      <div class="adm-actions">
        <button class="btn-accent" onclick="startRegister(${c.id})">등록</button>
        <button class="btn" onclick="doReject(${c.id})">반려</button>
      </div>
    </div>`).join('');
}
function memesView() {
  const rows = state.memes.map((m) => {
    const done = m.description && m.description.length > 0;
    return `<div class="adm-row" style="cursor:pointer" onclick="editMeme(${m.id})">
      <div class="t">${esc(m.name || '(무제)')} <span style="font-size:12px" class="${done ? 'badge-done' : 'badge-todo'}">${done ? '●' : '○ 미완성'}</span></div>
      <div class="m">${esc(m.status)} · ${esc(m.category || '미분류')} · 키워드 ${(m.keywords || []).length}개</div>
    </div>`;
  }).join('');
  return `<div class="searchbar"><input id="meme-q" placeholder="이름 검색 후 Enter" onkeydown="if(event.key==='Enter')searchMemes()"></div>
    <div style="margin-bottom:10px"><button class="btn-accent" onclick="newMeme()">+ 새 밈</button> <span style="font-size:12px;color:var(--mute3)">${state.memes.length}개</span></div>
    ${rows || '<div class="empty">없음</div>'}`;
}
function editForm() {
  const m = state.editing.meme || {};
  const cand = state.editing.cand;
  const head = cand ? '후보 등록 (아래 채워서 저장 → 밈으로 등록)' : (m.id ? `밈 편집 #${m.id}` : '새 밈');
  const ref = cand ? `<div class="hint" style="margin-bottom:12px">참고 후보: <a href="${esc(cand.url)}" target="_blank" rel="noopener">${esc(cand.title)}</a></div>` : '';
  return `
    <button class="btn" onclick="cancelEdit()">← 뒤로</button>
    <h2 style="font-family:var(--serif);font-size:20px;margin:14px 0 4px;">${head}</h2>${ref}
    <div class="field"><label>이름 (name)</label><input id="f-name" value="${esc(m.name || '')}"></div>
    <div class="field"><label>키워드 (매칭용 · 쉼표/줄바꿈 구분)</label><textarea id="f-keywords">${esc((m.keywords || []).join(', '))}</textarea><div class="hint">이모지 포함 표기변형. 3글자↑ 부분매칭 / 2글자 토큰매칭. 인명 단독 금지.</div></div>
    <div class="field"><label>뜻풀이 (description)</label><textarea id="f-desc">${esc(m.description || '')}</textarea></div>
    <div class="field"><label>표시 태그 (tags · 쉼표 구분)</label><input id="f-tags" value="${esc((m.tags || []).join(', '))}" placeholder="#반응, #유행어"></div>
    <div class="grid2">
      <div class="field"><label>분류 (category)</label><input id="f-cat" value="${esc(m.category || '')}"></div>
      <div class="field"><label>상태 (status)</label><select id="f-status"><option value="new" ${m.status === 'new' ? 'selected' : ''}>new (새로 올라온)</option><option value="steady" ${m.status === 'steady' ? 'selected' : ''}>steady (스테디)</option></select></div>
    </div>
    <div class="grid2">
      <div class="field"><label>출처 (source)</label><input id="f-src" value="${esc(m.source || '')}"></div>
      <div class="field"><label>사진 URL (photo_url)</label><input id="f-photo" value="${esc(m.photo_url || '')}"></div>
    </div>
    <div style="margin-top:16px;"><button class="btn-solid" onclick="saveEdit()">저장</button><span class="status-msg" id="save-msg"></span></div>`;
}
function render() {
  if (state.checking) { root.innerHTML = shell(`<div class="center">확인 중…</div>`); return; }
  if (!state.user) { root.innerHTML = shell(`<div class="center"><button class="btn-solid" onclick="login()">Google로 로그인</button></div>`); return; }
  if (!ADMINS.includes(state.user.email)) { root.innerHTML = shell(`<div class="center">권한 없음: ${esc(state.user.email)}<br><br><button class="btn" onclick="logout()">로그아웃</button></div>`); return; }
  root.innerHTML = shell(state.editing ? editForm() : (state.tab === 'candidates' ? candidatesView() : memesView()));
}

// ─── 시작 ───
async function init() {
  saveHashToken();
  if (!SB.url || !SB.key) { root.innerHTML = 'config.js 없음'; return; }
  if (!token()) { set({ checking: false, user: null }); return; }
  let u = null;
  try { u = await whoami(); } catch (e) {}
  state.checking = false; state.user = u;
  if (u && ADMINS.includes(u.email)) { try { await loadCandidates(); } catch (e) {} }
  render();
}
init();
