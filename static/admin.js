// memedics 관리자 — Supabase Auth(Google 암시적 OAuth) + 밈 등록/편집 + 후보 검토.
// 의존성 없이 REST 직접 호출. 방문자엔 RLS가 쓰기를 막고, 관리자 이메일만 통과.

const SB = window.__SB__ || { url: '', key: '' };
const ADMINS = ['jamm2ic@gmail.com', 'l89192164@gmail.com'];
const root = document.getElementById('admin');

// ─── 인증 (공유 auth.js 사용) ───
function login() { window.mmdAuth.login(); }
function logout() { window.mmdAuth.logout(); }
async function whoami() { return window.mmdAuth.whoami(); }
function h(extra) { return window.mmdAuth.headers(extra); }
async function api(path, opts = {}) {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, { ...opts, headers: h(opts.headers) });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// ─── 상태 ───
const state = { user: null, checking: true, tab: 'candidates', candidates: [], deaths: [], notmemes: [], memes: [], members: [], submissions: [], editing: null };
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
// 사망 후보(death_candidates 뷰): 기계 신호(30일 언급 0) × 인간 신호(90일 사망%≥70, 10표↑)
async function loadDeaths() {
  state.deaths = await api('death_candidates?select=*&order=dead_pct.desc');
}
async function patchMeme(id, data) {
  await api(`memes?id=eq.${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(data) });
}
const MEME_COLS = 'id,name,keywords,description,tags,category,status,source,photo_url,video_url,died_at';
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
  try {
    if (tab === 'candidates') await loadCandidates();
    else if (tab === 'submissions') await loadSubmissions();
    else if (tab === 'deaths') await loadDeaths();
    else if (tab === 'notmemes') await loadNotmemes();
    else if (tab === 'members') await loadMembers();
    else await loadMemes();
  } catch (e) {}
  render();
}
// 사망 선고: dead 전환 + died_at 기록. 부활은 밈 편집에서 status를 되돌리면 됨(died_at 자동 해제).
async function declareDeath(id) {
  const d = state.deaths.find((x) => x.id === id);
  if (!confirm(`"${d ? d.name : id}" 사망 선고합니다. 부고 구역으로 이동하며, 편집에서 되돌릴 수 있습니다.`)) return;
  try {
    await patchMeme(id, { status: 'dead', died_at: new Date().toISOString(), death_review_at: new Date().toISOString() });
    state.deaths = state.deaths.filter((x) => x.id !== id); render();
  } catch (e) { alert('선고 실패: ' + e.message); }
}
// 기각: 검토 시각만 기록 → 60일간 후보 재등장 안 함
async function dismissDeath(id) {
  try {
    await patchMeme(id, { death_review_at: new Date().toISOString() });
    state.deaths = state.deaths.filter((x) => x.id !== id); render();
  } catch (e) { alert('기각 실패: ' + e.message); }
}
async function loadMembers() {
  state.members = await api('profiles?select=email,full_name,created_at&order=created_at.desc');
}
// '밈 아님' 후보 — 회원 다수가 '밈이 아니다'로 판정(notmeme_candidates 뷰). 확정=삭제.
async function loadNotmemes() {
  state.notmemes = await api('notmeme_candidates?select=*&order=notmeme_pct.desc');
}
async function confirmNotmeme(id) {
  const n = state.notmemes.find((x) => x.id === id);
  if (!confirm(`"${n ? n.name : id}"을(를) '밈 아님'으로 확정해 삭제합니다. 측정·댓글·투표도 함께 삭제됩니다. 계속할까요?`)) return;
  try {
    await api(`memes?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    state.notmemes = state.notmemes.filter((x) => x.id !== id); render();
  } catch (e) { alert('삭제 실패: ' + e.message); }
}
async function dismissNotmeme(id) {
  try {
    await patchMeme(id, { notmeme_review_at: new Date().toISOString() });
    state.notmemes = state.notmemes.filter((x) => x.id !== id); render();
  } catch (e) { alert('기각 실패: ' + e.message); }
}
// 회원 밈 신청(사람 제안) — 기계 후보와 별개. 등록/반려는 관리자.
async function loadSubmissions() {
  state.submissions = await api('meme_submissions?status=eq.pending&select=id,name,description,example,source_url,tags,nick,email,created_at,photo_url,video_url&order=created_at.desc&limit=100');
}
async function patchSubmission(id, data) {
  await api(`meme_submissions?id=eq.${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(data) });
}
async function rejectSub(id) {
  try { await patchSubmission(id, { status: 'rejected' }); state.submissions = state.submissions.filter((s) => s.id !== id); render(); }
  catch (e) { alert('반려 실패: ' + e.message); }
}
function startRegisterSub(id) {
  const s = state.submissions.find((x) => x.id === id);
  set({ editing: { sub: s, meme: { name: s.name, description: s.description || '', tags: s.tags || [], source: s.source_url || '', photo_url: s.photo_url || '', video_url: s.video_url || '', status: 'new' } } });
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
async function deleteMeme(id) {
  if (!confirm('이 밈을 삭제합니다. 측정 데이터·댓글·투표도 함께 삭제됩니다. 계속할까요?')) return;
  const msg = document.getElementById('save-msg'); if (msg) msg.textContent = '삭제 중…';
  try {
    await api(`memes?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    cancelEdit();
  } catch (e) {
    if (msg) msg.textContent = '삭제 실패: ' + e.message + ' (측정 데이터 FK면 cascade SQL 필요)';
  }
}
async function searchMemes() { try { await loadMemes(val('meme-q')); } catch (e) {} render(); }
async function saveEdit() {
  const status = val('f-status');
  const prev = (state.editing.meme || {});
  const data = {
    name: val('f-name'), keywords: arr(val('f-keywords')), description: val('f-desc'),
    tags: arr(val('f-tags')), category: val('f-cat') || null, status,
    source: val('f-src') || null, photo_url: val('f-photo') || null, video_url: val('f-video') || null,
    // 사망이면 선고 시각 유지(없으면 지금), 아니면 해제(=부활)
    died_at: status === 'dead' ? (prev.died_at || new Date().toISOString()) : null,
  };
  const msg = document.getElementById('save-msg'); msg.textContent = '저장 중…';
  try {
    if (state.editing.cand) {
      await saveMeme(data, null); // 새 밈 생성
      await api(`discovery_candidates?id=eq.${state.editing.cand.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'registered' }) });
      state.candidates = state.candidates.filter((c) => c.id !== state.editing.cand.id);
    } else if (state.editing.sub) {
      await saveMeme(data, null); // 신청 → 새 밈 생성
      await patchSubmission(state.editing.sub.id, { status: 'accepted' }); // 트리거가 'accept' 로그 남김
      state.submissions = state.submissions.filter((s) => s.id !== state.editing.sub.id);
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
      <button class="${state.tab === 'submissions' ? 'on' : ''}" onclick="go('submissions')">신청</button>
      <button class="${state.tab === 'deaths' ? 'on' : ''}" onclick="go('deaths')">사망 검토</button>
      <button class="${state.tab === 'notmemes' ? 'on' : ''}" onclick="go('notmemes')">밈 아님</button>
      <button class="${state.tab === 'memes' ? 'on' : ''}" onclick="go('memes')">밈 관리</button>
      <button class="${state.tab === 'members' ? 'on' : ''}" onclick="go('members')">회원</button>
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
function deathsView() {
  if (!state.deaths.length) return `<div class="empty">사망 후보가 없습니다. (조건: 최근 90일 사망 판정 70%↑ · 10표↑ · 30일 언급 0)</div>`;
  return `<div style="margin-bottom:12px;font-size:13px;color:var(--mute3)">기계(언급 소멸)·인간(판정 여론) 두 신호가 모두 충족된 밈입니다. 선고는 사람이 내립니다.</div>` +
    state.deaths.map((d) => `
    <div class="adm-row">
      <div class="t">${esc(d.name)} <span style="font-size:12px;color:var(--mute)">${esc(d.category || '미분류')}</span></div>
      <div class="m">사망 판정 ${esc(d.dead_pct)}% (${d.dead_votes}/${d.votes}표) · 최근 30일 언급 ${d.mentions_30d}건</div>
      <div class="adm-actions">
        <button class="btn" style="border-color:#c0392b;color:#c0392b" onclick="declareDeath(${d.id})">† 사망 선고</button>
        <button class="btn" onclick="dismissDeath(${d.id})">기각 (60일 보류)</button>
      </div>
    </div>`).join('');
}
function submissionsView() {
  if (!state.submissions.length) return `<div class="empty">대기 중인 신청이 없습니다.</div>`;
  return `<div style="margin-bottom:12px;font-size:13px;color:var(--mute3)">회원이 제안한 밈입니다. 등록은 관리자가 결정합니다.</div>` +
    state.submissions.map((s) => `
    <div class="adm-row">
      <div class="t">${esc(s.name)}</div>
      <div class="m">${esc(s.nick || s.email || '익명')} · ${esc((s.created_at || '').slice(0, 10))}${s.source_url ? ` · <a href="${esc(s.source_url)}" target="_blank" rel="noopener">출처</a>` : ''}${s.photo_url ? ` · <a href="${esc(s.photo_url)}" target="_blank" rel="noopener">📷 사진</a>` : ''}${s.video_url ? ` · <a href="${esc(s.video_url)}" target="_blank" rel="noopener">🎬 동영상</a>` : ''}</div>
      ${s.description ? `<div class="m" style="margin-top:6px;color:var(--ink2)">${esc(s.description)}</div>` : ''}
      ${s.example ? `<div class="m" style="margin-top:4px">예: ${esc(s.example)}</div>` : ''}
      <div class="adm-actions">
        <button class="btn-accent" onclick="startRegisterSub(${s.id})">등록</button>
        <button class="btn" onclick="rejectSub(${s.id})">반려</button>
      </div>
    </div>`).join('');
}
function notmemesView() {
  if (!state.notmemes.length) return `<div class="empty">'밈 아님' 후보가 없습니다. (조건: 10표↑ · '밈 아님' 70%↑)</div>`;
  return `<div style="margin-bottom:12px;font-size:13px;color:var(--mute3)">회원 다수가 '밈이 아니다'로 판정한 항목입니다. 삭제는 사람이 결정합니다.</div>` +
    state.notmemes.map((n) => `
    <div class="adm-row">
      <div class="t">${esc(n.name)} <span style="font-size:12px;color:var(--mute)">${esc(n.category || '미분류')}</span></div>
      <div class="m">'밈 아님' ${esc(n.notmeme_pct)}% (${n.notmeme_votes}/${n.votes}표)</div>
      <div class="adm-actions">
        <button class="btn" style="border-color:#c0392b;color:#c0392b" onclick="confirmNotmeme(${n.id})">밈 아님 확정(삭제)</button>
        <button class="btn" onclick="dismissNotmeme(${n.id})">기각 (60일 보류)</button>
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
function membersView() {
  if (!state.members.length) return `<div class="empty">가입한 회원이 없습니다.</div>`;
  return `<div style="margin-bottom:12px;font-size:13px;color:var(--mute3)">가입/로그인 ${state.members.length}명</div>` +
    state.members.map((m) => `
    <div class="adm-row">
      <div class="t">${esc(m.full_name || '(이름 없음)')}</div>
      <div class="m">${esc(m.email || '')} · 가입 ${esc((m.created_at || '').slice(0, 10))}</div>
    </div>`).join('');
}
function editForm() {
  const m = state.editing.meme || {};
  const cand = state.editing.cand;
  const sub = state.editing.sub;
  const head = cand ? '후보 등록 (아래 채워서 저장 → 밈으로 등록)'
    : sub ? '신청 등록 (아래 채워서 저장 → 밈으로 등록)'
    : (m.id ? `밈 편집 #${m.id}` : '새 밈');
  const ref = cand ? `<div class="hint" style="margin-bottom:12px">참고 후보: <a href="${esc(cand.url)}" target="_blank" rel="noopener">${esc(cand.title)}</a></div>`
    : sub ? `<div class="hint" style="margin-bottom:12px">신청자: ${esc(sub.nick || sub.email || '익명')}${sub.example ? ` · 예: ${esc(sub.example)}` : ''}${sub.source_url ? ` · <a href="${esc(sub.source_url)}" target="_blank" rel="noopener">출처</a>` : ''}</div>`
    : '';
  return `
    <button class="btn" onclick="cancelEdit()">← 뒤로</button>
    <h2 style="font-family:var(--serif);font-size:20px;margin:14px 0 4px;">${head}</h2>${ref}
    <div class="field"><label>이름 (name)</label><input id="f-name" value="${esc(m.name || '')}"></div>
    <div class="field"><label>키워드 (매칭용 · 쉼표/줄바꿈 구분)</label><textarea id="f-keywords">${esc((m.keywords || []).join(', '))}</textarea><div class="hint">이모지 포함 표기변형. 3글자↑ 부분매칭 / 2글자 토큰매칭. 인명 단독 금지.</div></div>
    <div class="field"><label>뜻풀이 (description)</label><textarea id="f-desc">${esc(m.description || '')}</textarea></div>
    <div class="field"><label>표시 태그 (tags · 쉼표 구분)</label><input id="f-tags" value="${esc((m.tags || []).join(', '))}" placeholder="#반응, #유행어"></div>
    <div class="grid2">
      <div class="field"><label>분류 (category)</label><input id="f-cat" value="${esc(m.category || '')}"></div>
      <div class="field"><label>상태 (status)</label><select id="f-status"><option value="new" ${m.status === 'new' ? 'selected' : ''}>new (새로 올라온)</option><option value="steady" ${m.status === 'steady' ? 'selected' : ''}>steady (스테디)</option><option value="dead" ${m.status === 'dead' ? 'selected' : ''}>dead (사망 — 부고 구역)</option></select><div class="hint">dead→steady로 되돌리면 부활(died_at 자동 해제)</div></div>
    </div>
    <div class="grid2">
      <div class="field"><label>출처 (source)</label><input id="f-src" value="${esc(m.source || '')}"></div>
      <div class="field"><label>사진 URL (photo_url)</label><input id="f-photo" value="${esc(m.photo_url || '')}"></div>
    </div>
    <div class="field"><label>동영상 URL (video_url)</label><input id="f-video" value="${esc(m.video_url || '')}"><div class="hint">신청 등록 시 첨부 미디어가 자동 채워집니다</div></div>
    <div style="margin-top:16px;display:flex;align-items:center;gap:12px;">
      <button class="btn-solid" onclick="saveEdit()">저장</button>
      ${m.id ? `<button class="btn" style="border-color:#c0392b;color:#c0392b" onclick="deleteMeme(${m.id})">삭제</button>` : ''}
      <span class="status-msg" id="save-msg"></span>
    </div>`;
}
function render() {
  if (state.checking) { root.innerHTML = shell(`<div class="center">확인 중…</div>`); return; }
  if (!state.user) { root.innerHTML = shell(`<div class="center"><button class="btn-solid" onclick="login()">Google로 로그인</button></div>`); return; }
  if (!ADMINS.includes(state.user.email)) { root.innerHTML = shell(`<div class="center">권한 없음: ${esc(state.user.email)}<br><br><button class="btn" onclick="logout()">로그아웃</button></div>`); return; }
  const view = state.editing ? editForm()
    : state.tab === 'candidates' ? candidatesView()
    : state.tab === 'submissions' ? submissionsView()
    : state.tab === 'deaths' ? deathsView()
    : state.tab === 'notmemes' ? notmemesView()
    : state.tab === 'members' ? membersView()
    : memesView();
  root.innerHTML = shell(view);
}

// ─── 시작 ───
async function init() {
  if (!SB.url || !SB.key) { root.innerHTML = 'config.js 없음'; return; }
  if (!window.mmdAuth.token()) { set({ checking: false, user: null }); return; }
  let u = null;
  try { u = await whoami(); } catch (e) {}
  state.checking = false; state.user = u;
  if (u && ADMINS.includes(u.email)) { try { await loadCandidates(); } catch (e) {} }
  render();
}
init();
