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
const state = { user: null, checking: true, tab: 'candidates', candidates: [], deaths: [], notmemes: [], memes: [], members: [], submissions: [], editing: null, eraSummary: null, eraByAge: [], eraItems: [] };
function set(p) { Object.assign(state, p); render(); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function val(id) { return document.getElementById(id).value.trim(); }
function arr(s) { return (s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean); }

// 분류 드롭다운 선택지 (src/lib/categories.ts와 동일하게 유지). 기존 비표준 값은 편집 시 보존.
const CATEGORIES = ['일반인', '크리에이터', '방송인', '배우', '가수', '래퍼', '프로그램', '게임', '캐릭터', '신조어', '외국', '기타'];
function catOptions(cur) {
  cur = (cur || '').trim();
  const list = CATEGORIES.slice();
  if (cur && !list.includes(cur)) list.push(cur); // DB의 기존 비표준 분류 보존
  return ['<option value="">— 분류 선택 —</option>']
    .concat(list.map((c) => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`))
    .join('');
}

// ─── 데이터 ───
async function loadCandidates() {
  state.candidates = await api('discovery_candidates?status=eq.pending&select=id,title,url,source_type,found_at,kind,term,evidence,score&order=found_at.desc&limit=100');
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
const MEME_COLS = 'id,name,keywords,description,tags,category,status,source,photo_url,video_url,media,died_at';
async function loadMemes(q) {
  const filter = q ? `&name=ilike.*${encodeURIComponent(q)}*` : '';
  state.memes = await api(`memes?select=${MEME_COLS}&order=id.desc&limit=300${filter}`);
}
// 판독기(era) 보정 지표 — db/era_calibration.sql의 뷰 3개(admin.js는 뷰 정의는 몰라도 그대로 select만 함)
async function loadEraStats() {
  const [summary, byAge, items] = await Promise.all([
    api('era_calibration_summary?select=*'),
    api('era_calibration?select=*'),
    api('meme_awareness_stats?select=*&knows_total=gte.5&order=awareness_pct.asc&limit=300'),
  ]);
  state.eraSummary = summary && summary[0] ? summary[0] : null;
  state.eraByAge = byAge || [];
  state.eraItems = items || [];
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
    else if (tab === 'era') await loadEraStats();
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
  state.submissions = await api('meme_submissions?status=eq.pending&select=id,name,description,example,source_url,tags,nick,email,created_at,photo_url,video_url,media&order=created_at.desc&limit=100');
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
  const meme = { name: s.name, description: s.description || '', tags: s.tags || [], source: s.source_url || '', status: 'new' };
  set({ editing: { sub: s, meme, ...initMedia({ media: s.media, photo_url: s.photo_url, video_url: s.video_url }) } });
}
function startRegister(id) {
  const c = state.candidates.find((x) => x.id === id);
  // term형(검색수요 발굴)이면 이름·키워드를 미리 채움
  const meme = c.kind === 'term' && c.term ? { name: c.term, keywords: [c.term] } : {};
  set({ editing: { cand: c, meme, photos: [], video: '' } });
}
async function doReject(id) {
  try {
    await rejectCandidate(id);
    // term형이면 rejected_terms에도 기록 → 발굴 파이프라인이 다시 안 올림(환류)
    const c = state.candidates.find((x) => x.id === id);
    if (c && c.kind === 'term' && c.term) {
      try { await api('rejected_terms', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ term: c.term, note: 'candidate reject' }) }); } catch (e2) {}
    }
    state.candidates = state.candidates.filter((x) => x.id !== id); render();
  }
  catch (e) { alert('반려 실패: ' + e.message); }
}
function editMeme(id) { const m = state.memes.find((x) => x.id === id); set({ editing: { meme: m, ...initMedia(m) } }); }
function newMeme() { set({ editing: { meme: {}, photos: [], video: '' } }); }
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
  const photos = (state.editing.photos || []).filter(Boolean);
  const video = (state.editing.video || '').trim();
  const data = {
    name: val('f-name'), keywords: arr(val('f-keywords')), description: val('f-desc'),
    tags: arr(val('f-tags')), category: val('f-cat') || null, status,
    source: val('f-src') || null,
    photo_url: photos[0] || null, // 커버 = 첫 사진
    video_url: video || null,
    // 사망이면 선고 시각 유지(없으면 지금), 아니면 해제(=부활)
    died_at: status === 'dead' ? (prev.died_at || new Date().toISOString()) : null,
  };
  // media 배열: 사진들(첫 장=커버) + 동영상(업로드 파일 URL 또는 유튜브 링크)
  data.media = [];
  for (const u of photos) data.media.push({ type: 'image', url: u });
  if (video) data.media.push({ type: 'video', url: video });
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
      <button class="${state.tab === 'era' ? 'on' : ''}" onclick="go('era')">판독기 통계</button>
    </div>` : '';
  return `<div class="admin-wrap">
    <div class="admin-head"><h1>memedics · 관리자</h1><span style="font-size:13px;color:var(--mute)">${who}</span></div>
    ${tabs}${inner}</div>`;
}
function candidatesView() {
  if (!state.candidates.length) return `<div class="empty">대기 중인 후보가 없습니다.</div>`;
  return state.candidates.map((c) => {
    // term형(검색수요 발굴): 링크 대신 단어 + 근거 요약
    const head = c.kind === 'term'
      ? `<span style="font-weight:600">${esc(c.term || c.title)}</span> <span style="font-size:12px;color:var(--accent)">검색수요</span>`
      : `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>`;
    const ev = c.kind === 'term' && c.evidence
      ? `<div class="m">근거: "뜻" 검색 ${c.score >= 99 ? '0→양수 전환' : `${Number(c.score).toFixed(1)}배 급증`}${c.evidence.autocomplete ? ' · 자동완성 있음' : ''}${c.evidence.traffic ? ` · 트래픽 ${esc(c.evidence.traffic)}` : ''}</div>`
      : '';
    return `
    <div class="adm-row">
      <div class="t">${head}</div>
      <div class="m">${esc(c.source_type || '')} · ${esc((c.found_at || '').slice(0, 10))}</div>
      ${ev}
      <div class="adm-actions">
        <button class="btn-accent" onclick="startRegister(${c.id})">등록</button>
        <button class="btn" onclick="doReject(${c.id})">반려</button>
      </div>
    </div>`;
  }).join('');
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
      <div class="m">${esc(s.nick || s.email || '익명')} · ${esc((s.created_at || '').slice(0, 10))}${s.source_url ? ` · <a href="${esc(s.source_url)}" target="_blank" rel="noopener">출처</a>` : ''}${(s.media && s.media.length) ? ` · 📎 미디어 ${s.media.length}개` : ''}</div>
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
// ─── 미디어 업로드 (Supabase Storage 'media' 버킷 · 본인 uid 폴더) ───
const MAX_IMG = 10 * 1024 * 1024; // 10MB
const MAX_VID = 50 * 1024 * 1024; // 50MB (버킷 제한과 동일)

async function uploadFile(file) {
  const safe = (file.name || 'file').replace(/[^\w.\-]/g, '_').slice(-60);
  const path = `${state.user.id}/${Date.now()}-${safe}`;
  const r = await fetch(`${SB.url}/storage/v1/object/media/${path}`, {
    method: 'POST', headers: h({ 'Content-Type': file.type || 'application/octet-stream' }), body: file,
  });
  if (!r.ok) throw new Error(`업로드 ${r.status}: ${await r.text()}`);
  return `${SB.url}/storage/v1/object/public/media/${path}`;
}
// 유튜브 링크 → 영상 ID (watch·youtu.be·shorts·embed·live). 아니면 null.
function ytId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function isUploadedMedia(url) { return /\/storage\/v1\/object\/public\/media\//.test(String(url || '')); }

// 편집 시작 시 photos(이미지 URL 배열, [0]=커버)·video(단일 URL) 초기화
function initMedia(m) {
  const imgs = ((m && m.media) || []).filter((x) => x && x.type === 'image').map((x) => x.url);
  const cover = (m && m.photo_url) || imgs[0] || '';
  const photos = cover ? [cover, ...imgs.filter((u) => u !== cover)] : imgs.slice();
  const vid = ((m && m.media) || []).find((x) => x && x.type === 'video');
  const video = (m && m.video_url) || (vid && vid.url) || '';
  return { photos, video };
}

// 사진 영역 (파일 업로드 · #photo-area만 부분 갱신 → 다른 입력 안 잃음)
function photoAreaHtml() {
  const photos = state.editing.photos || [];
  const cells = photos.map((u, i) => `
    <div class="media-cell">
      <img src="${esc(u)}" alt="">
      ${i === 0 ? '<span class="cover-badge">커버</span>' : ''}
      <button type="button" class="media-cell-x" onclick="removePhoto(${i})" aria-label="제거">✕</button>
    </div>`).join('');
  return `
    <input type="file" accept="image/*" multiple onchange="pickPhotos(this)">
    <div class="media-up" id="photo-up"></div>
    <div class="media-grid">${cells}</div>
    <div class="hint">첫 번째 사진이 커버로 쓰입니다. 여러 장 가능 (장당 10MB↓)</div>`;
}
async function pickPhotos(input) {
  const files = Array.from(input.files || []); input.value = '';
  const up = document.getElementById('photo-up');
  for (const f of files) {
    if (f.size > MAX_IMG) { alert(`${f.name}: 사진은 10MB 이하만 가능해요`); continue; }
    // 4:3 고정비율 크롭(프레임 안에서 이동·확대)
    let file = f;
    if (window.cropImageToRatio) {
      const blob = await window.cropImageToRatio(f, 4 / 3);
      if (!blob) continue; // 취소
      file = new File([blob], f.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    }
    if (up) up.textContent = `업로드 중… ${file.name}`;
    try { const url = await uploadFile(file); state.editing.photos.push(url); refreshPhotos(); }
    catch (e) { if (up) up.textContent = ''; alert('업로드 실패: ' + e.message); }
  }
}
function removePhoto(i) { state.editing.photos.splice(i, 1); refreshPhotos(); }
function refreshPhotos() { const el = document.getElementById('photo-area'); if (el) el.innerHTML = photoAreaHtml(); }

// 동영상 영역 (파일 업로드 또는 유튜브 링크 · 유튜브면 썸네일 미리보기)
function videoPreviewHtml() {
  const v = state.editing.video;
  if (!v) return '';
  const id = ytId(v);
  let inner;
  if (id) inner = `<img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="유튜브 썸네일" style="max-width:260px;border-radius:6px;display:block"><div class="hint">유튜브 영상 인식됨</div>`;
  else if (isUploadedMedia(v)) inner = `<video src="${esc(v)}" controls muted playsinline preload="metadata" style="max-width:260px;border-radius:6px"></video>`;
  else inner = `<div class="hint" style="color:#c0392b">유튜브 링크가 아니에요. 유튜브 URL을 넣거나 파일을 업로드하세요.</div>`;
  return `<div style="margin-top:8px">${inner}<div style="margin-top:6px"><button type="button" class="btn" onclick="clearVideo()">동영상 제거</button></div></div>`;
}
function videoAreaHtml() {
  const v = state.editing.video || '';
  return `
    <input type="file" accept="video/*" onchange="pickVideo(this)">
    <div class="media-up" id="video-up"></div>
    <div style="margin:8px 0 4px;font-size:12px;color:var(--mute)">또는 유튜브 링크 붙여넣기</div>
    <input id="f-video-url" value="${esc(v)}" placeholder="https://www.youtube.com/watch?v=..." oninput="onVideoUrl(this.value)">
    <div id="video-prev">${videoPreviewHtml()}</div>
    <div class="hint">영상 파일 업로드(50MB↓) 또는 유튜브 링크. 링크는 유튜브만 지원.</div>`;
}
async function pickVideo(input) {
  const f = (input.files || [])[0]; input.value = '';
  if (!f) return;
  if (f.size > MAX_VID) { alert('영상 파일은 50MB 이하만 가능해요 (더 크면 유튜브 링크를 쓰세요)'); return; }
  const up = document.getElementById('video-up'); if (up) up.textContent = '업로드 중…';
  try { const url = await uploadFile(f); state.editing.video = url; refreshVideo(); }
  catch (e) { if (up) up.textContent = ''; alert('업로드 실패: ' + e.message); }
}
function onVideoUrl(v) { state.editing.video = (v || '').trim(); updateVideoPreview(); }
function clearVideo() { state.editing.video = ''; refreshVideo(); }
function refreshVideo() { const el = document.getElementById('video-area'); if (el) el.innerHTML = videoAreaHtml(); }
function updateVideoPreview() { const el = document.getElementById('video-prev'); if (el) el.innerHTML = videoPreviewHtml(); }

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
      <div class="field"><label>분류 (category)</label><select id="f-cat">${catOptions(m.category)}</select></div>
      <div class="field"><label>상태 (status)</label><select id="f-status"><option value="new" ${m.status === 'new' ? 'selected' : ''}>new (새로 올라온)</option><option value="steady" ${m.status === 'steady' ? 'selected' : ''}>steady (스테디)</option><option value="dead" ${m.status === 'dead' ? 'selected' : ''}>dead (사망 — 부고 구역)</option></select><div class="hint">dead→steady로 되돌리면 부활(died_at 자동 해제)</div></div>
    </div>
    <div class="field"><label>출처 (source)</label><input id="f-src" value="${esc(m.source || '')}"></div>
    <div class="field"><label>이미지 (파일 업로드)</label><div id="photo-area">${photoAreaHtml()}</div></div>
    <div class="field"><label>동영상 (파일 업로드 또는 유튜브 링크)</label><div id="video-area">${videoAreaHtml()}</div></div>
    <div style="margin-top:16px;display:flex;align-items:center;gap:12px;">
      <button class="btn-solid" onclick="saveEdit()">저장</button>
      ${m.id ? `<button class="btn" style="border-color:#c0392b;color:#c0392b" onclick="deleteMeme(${m.id})">삭제</button>` : ''}
      <span class="status-msg" id="save-msg"></span>
    </div>`;
}
// 판독기(era) 보정 지표 — db/era_calibration.sql 뷰 3개를 그대로 표로. 목적은 딱 두 가지:
//  ① 나이대별 평균 판독연도가 어릴수록 높게(단조 감소) 나오는지 — 상관계수 부호로 한눈에.
//  ② 인지도(%)가 극단(90%+ 또는 한 자릿수)인 문항 — 변별력 없는 출제 후보를 솎아낼 목록.
function eraStatsView() {
  const s = state.eraSummary;
  // 상관계수 하나로 다 판단하지 않는다 — cascading reminiscence bump(Krumhansl & Zupnick 2013)에 따르면
  // 옛 콘텐츠 인지도는 나이에 따라 매끈히 줄지 않고 특정 시기에 덩어리(bump)로 뭉친다. 전체 상관이
  // 약해도 나이대별 표에서 국소적으로는 갈릴 수 있으므로, 표 자체의 단조성을 따로 계산해 같이 보여준다.
  const ages = state.eraByAge;
  let shape = '표본 부족';
  if (ages.length >= 3) {
    const vals = ages.map((r) => r.avg_mental_year);
    const monotone = vals.every((v, i) => i === 0 || v <= vals[i - 1]);
    shape = monotone
      ? '나이대별 표도 매끈하게 감소 — 단순 상관 해석 신뢰 가능'
      : '⚠ 나이대별 표가 매끈하지 않음(중간에 역전 구간 있음) — 전체 상관만 보지 말고 아래 표에서 어느 나이대가 튀는지 직접 확인할 것 (덩어리 패턴 가능성)';
  }
  const corrNote = s && s.n >= 20
    ? (s.age_year_corr < -0.1 ? '정상(어릴수록 연도↑)' : s.age_year_corr > 0.1 ? '⚠ 반대 방향 — 가중치 재설계 필요' : '⚠ 상관 약함 — 아래 나이대별 표에서 국소 패턴 확인 필요(전체 무상관과 덩어리 패턴은 이 숫자만으론 구별 안 됨)')
    : '표본 부족(n<20) — 판단 보류';
  const ageRows = state.eraByAge.length
    ? state.eraByAge.map((r) => `
      <div class="adm-row">
        <div class="t">${esc(r.age_band)} <span style="font-size:12px;color:var(--mute)">n=${r.n}</span></div>
        <div class="m">평균 판독연도 ${r.avg_mental_year} (표준편차 ${r.stddev_mental_year ?? '-'}) · 평균 인지율 ${r.avg_known_pct}%</div>
      </div>`).join('')
    : `<div class="empty">era_readings 표본이 아직 없습니다.</div>`;
  const extreme = state.eraItems.slice(0, 20).concat(state.eraItems.slice(-20).reverse());
  const itemRows = state.eraItems.length
    ? extreme.map((r) => `
      <div class="adm-row">
        <div class="t">${esc(r.name)} <span style="font-size:12px;color:var(--mute)">${r.era_year ?? '-'}</span></div>
        <div class="m">인지도 ${r.awareness_pct}% (${r.knows_yes}/${r.knows_total}) ${r.awareness_pct >= 90 || r.awareness_pct <= 15 ? '— 변별력 낮음, 솎아낼 후보' : ''}</div>
      </div>`).join('')
    : `<div class="empty">meme_awareness 표본(문항당 5건↑)이 아직 없습니다.</div>`;
  return `
    <div style="margin-bottom:8px;font-size:13px;color:var(--mute3)">
      나이대↔판독연도 상관계수: <b>${s ? s.age_year_corr : '-'}</b> (n=${s ? s.n : 0}) — ${corrNote}
    </div>
    <div style="margin-bottom:16px;font-size:13px;color:var(--mute3)">나이대별 표 형태: ${shape}</div>
    <h3 style="font-size:15px;margin:0 0 8px">나이대별 판독값</h3>
    ${ageRows}
    <h3 style="font-size:15px;margin:20px 0 8px">인지도 극단 문항 (상위/하위 20, 표본 5건↑)</h3>
    ${itemRows}`;
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
    : state.tab === 'era' ? eraStatsView()
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
