// 밈 사전 — 프론트. 데이터는 브라우저에서 Supabase(anon 키)로 직접 조회/기록한다.
// (서버 Node는 이 환경에서 Supabase에 못 붙으므로 프론트 직결. anon 키는 RLS로 방어됨.)
//  - 밈 카드: meme_cards 뷰 (밈 + 언급량 + 댓글수 + 투표집계)
//  - 방문자 댓글: meme_comments, 투표: meme_votes

const SB = { url: '', key: '' };
function sbHeaders(extra) { return { apikey: SB.key, Authorization: `Bearer ${SB.key}`, ...extra }; }
async function sbGet(path) {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
async function sbPost(path, body, prefer = 'return=representation') {
  const r = await fetch(`${SB.url}/rest/v1/${path}`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: prefer }),
    body: JSON.stringify(body),
  });
  if (!r.ok) { const t = await r.text(); const e = new Error(`POST ${path} ${r.status}: ${t}`); e.status = r.status; throw e; }
  return prefer.includes('representation') ? r.json() : null;
}

// 브라우저별 투표 식별자(1인1표 UX용) + 이미 투표한 밈 기록
function voterId() {
  let v = localStorage.getItem('meme-voter');
  if (!v) { v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('meme-voter', v); }
  return v;
}
function votedMap() { try { return JSON.parse(localStorage.getItem('meme-voted') || '{}'); } catch (e) { return {}; } }
function markVoted(id, choice) { const m = votedMap(); m[id] = choice; localStorage.setItem('meme-voted', JSON.stringify(m)); }

// ─── 상태 ───────────────────────────────────────────
const state = {
  page: 'new', lastList: 'new',
  newVariant: 'a', steadyVariant: 'a', steadyCat: '전체',
  cards: [], loading: true, error: '',
  selectedId: null,
  detailComments: [], detailLoading: false,
  user: null, draftNick: '', draftText: '', reported: false,
  deckIndex: 0, deckDone: false,
  narrow: window.innerWidth < 720,
};
const CATS = ['전체', '방송인', '크리에이터', '일반인', '캐릭터', '기타'];
const app = document.getElementById('app');

function setState(patch, render = true) { Object.assign(state, patch); if (render) draw(); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── 데이터 로드 ────────────────────────────────────
async function init() {
  try {
    const cfg = await (await fetch('/api/config')).json();
    SB.url = cfg.supabaseUrl; SB.key = cfg.anonKey;
    if (!SB.url || !SB.key) throw new Error('Supabase 설정 없음(.env 확인)');
    await loadCards();
    setState({ loading: false });
  } catch (err) {
    setState({ loading: false, error: err.message });
  }
}
async function loadCards() {
  const rows = await sbGet('meme_cards?select=*&order=created_at.desc');
  state.cards = rows.map(mapCard);
}
function mapCard(r) {
  const created = r.created_at ? new Date(r.created_at) : new Date();
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  return {
    id: r.id, name: r.name || '', tags: r.tags || [], desc: r.description || '',
    cat: r.category || '', src: r.source || '', photo: !!r.photo_url, photoUrl: r.photo_url || '',
    status: r.status || 'new', days, months: Math.floor(days / 30),
    mentions: r.mentions || 0, commentCount: r.comment_count || 0,
    voteYes: r.vote_yes || 0, voteNo: r.vote_no || 0,
  };
}
function newCards() { return state.cards.filter(c => c.status === 'new'); }
function steadyCards() { return state.cards.filter(c => c.status === 'steady'); }
function findCard(id) { return state.cards.find(c => String(c.id) === String(id)); }

function tagText(m) { return (m.tags || []).join(' '); }
function metaNew(m) { const age = m.days === 0 ? '오늘 등록' : `${m.days}일 전 등록`; return `${age} · 댓글 ${m.commentCount}개`; }
function metaSteady(m) { return `등록 ${m.months}개월 전 · 최근 댓글 ${m.commentCount}개`; }
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

// ─── 조각 ───────────────────────────────────────────
function photoSlot(cls, label) { return `<div class="photo-slot ${cls}">${label}</div>`; }
function nameHtml(m, cls) { return m.name ? `<span class="m-name ${cls || ''}">${esc(m.name)}</span>` : ''; }
function descHtml(m, cls) { return m.desc ? `<p class="m-desc ${cls || ''}">${esc(m.desc)}</p>` : ''; }

function masthead() {
  return `<div class="wrap masthead">
    <div class="eyebrow">Meme Dictionary</div>
    <h1>밈 사전</h1>
    <p class="lede">새로 뜬 밈과 오래 살아남은 밈을 모아 둡니다. 판정하지 않고, 있는 그대로 보여드립니다. 해석은 읽는 사람의 몫.</p>
    <div class="rule"></div>
  </div>`;
}

function deckSection() {
  const list = newCards();
  const dlen = list.length;
  let cards = '';
  if (!state.deckDone && dlen > 0) {
    for (let off = 2; off >= 0; off--) {
      const idx = state.deckIndex + off;
      if (idx >= dlen) continue;
      const m = list[idx];
      const top = off === 0;
      const transform = top ? 'translate(0,0)' : `translateY(${off*14}px) scale(${(1-off*0.045).toFixed(3)})`;
      const shadow = top ? '0 14px 32px rgba(20,60,64,0.16)' : '0 4px 14px rgba(0,0,0,0.05)';
      cards += `<div class="deck-card" data-top="${top?1:0}" data-id="${m.id}"
        style="z-index:${30-off};transform:${transform};box-shadow:${shadow};cursor:${top?'grab':'default'};transition:transform .24s ease;">
        ${m.photo ? photoSlot('', '사진 / 동영상') : ''}
        <div class="card-body">
          ${nameHtml(m)}<div class="m-tags">${esc(tagText(m))}</div>
          ${descHtml(m)}<div class="spacer"></div>
          <div class="m-meta">${metaNew(m)}</div>
        </div></div>`;
    }
  }
  const empty = dlen === 0 ? `<div class="deck-done"><span>아직 새로 뜬 밈이 없어요</span></div>` : '';
  const done = state.deckDone ? `<div class="deck-done">
      <span>새로 뜬 밈을 다 넘겨봤어요</span>
      <button class="btn-accent" data-act="resetDeck">처음부터 다시</button></div>` : '';
  const counter = dlen ? `${Math.min(state.deckIndex + 1, dlen)} / ${dlen}` : '0 / 0';
  return `<div class="wrap deck-section">
    <div class="deck-title">넘겨보기 · 새로 뜬 밈</div>
    <div class="deck-holder">
      <div class="deck-stage">${cards}${empty}${done}</div>
      <div class="deck-nav">
        <button class="btn" data-act="deckPrev">← 이전</button>
        <span class="deck-counter">${counter}</span>
        <button class="btn-accent" data-act="deckPass">넘기기 →</button>
      </div>
      <div class="deck-hint">카드를 좌우로 드래그하거나 버튼으로 넘겨보세요 · 탭하면 자세히</div>
    </div>
    <div class="rule" style="margin-top:30px;"></div>
  </div>`;
}

function tabs() {
  return `<div class="wrap"><div class="tabs">
    <button class="tab ${state.page==='new'?'active':''}" data-act="goNew">새로 올라온</button>
    <button class="tab ${state.page==='steady'?'active':''}" data-act="goSteady">스테디</button>
  </div></div>`;
}

function pageNew() {
  const a = state.newVariant === 'a';
  const list = newCards();
  const seg = `<div class="seg"><button class="${a?'on':''}" data-act="newVarA">목록형</button><button class="${!a?'on':''}" data-act="newVarB">카드형</button></div>`;
  let body;
  if (!list.length) body = `<div class="empty">아직 새로 올라온 밈이 없습니다.</div>`;
  else if (a) {
    body = `<div class="rows">` + list.map(m => `
      <div class="row" data-act="open" data-id="${m.id}">
        <div class="col"><div class="rowline">${nameHtml(m)}<span class="m-tags">${esc(tagText(m))}</span></div>
          ${descHtml(m)}<div class="m-meta">${metaNew(m)}</div></div>
        ${m.photo ? photoSlot('thumb','사진') : ''}
      </div>`).join('') + `</div>`;
  } else {
    body = `<div class="cards">` + list.map(m => `
      <div class="card" data-act="open" data-id="${m.id}">
        ${m.photo ? photoSlot('cardphoto','사진 / 동영상') : ''}
        ${nameHtml(m)}<div class="m-tags">${esc(tagText(m))}</div>${descHtml(m)}
        <div class="spacer"></div><div class="foot">${metaNew(m)}</div>
      </div>`).join('') + `</div>`;
  }
  return `<div class="wrap page"><div class="list-head">
      <div class="count">최근 등록순 · ${list.length}개 항목</div>${seg}
    </div>${body}</div>`;
}

function pageSteady() {
  const a = state.steadyVariant === 'a';
  const seg = `<div class="seg"><button class="${a?'on':''}" data-act="steadyVarA">사전형</button><button class="${!a?'on':''}" data-act="steadyVarB">색인형</button></div>`;
  const cats = `<div class="cats">` + CATS.map(c => `<button class="cat ${state.steadyCat===c?'on':''}" data-act="setCat" data-id="${esc(c)}">${esc(c)}</button>`).join('') + `</div>`;
  let list = steadyCards();
  if (state.steadyCat !== '전체') list = list.filter(m => m.cat === state.steadyCat);
  let body;
  if (!list.length) body = `<div class="empty">이 분류엔 아직 스테디 밈이 없습니다.</div>`;
  else if (a) {
    body = `<div class="rows">` + list.map((m,i) => `
      <div class="dict-row" data-act="open" data-id="${m.id}">
        <div class="dict-idx">${String(i+1).padStart(2,'0')}</div>
        <div class="col"><div class="dict-head">${nameHtml(m)}<span class="m-tags">${esc(tagText(m))}</span></div>
          ${m.desc?`<p class="m-desc" style="font-size:14px;margin:5px 0 0;">${esc(m.desc)}</p>`:''}
          <div class="m-meta">${metaSteady(m)}</div></div>
      </div>`).join('') + `</div>`;
  } else {
    body = `<div style="border-top:1px solid var(--line);padding-top:6px;">` + list.map(m => `
      <div class="idx-row" data-act="open" data-id="${m.id}">
        <div class="idx-line"><span class="idx-term">${m.name?`<span class="nm">${esc(m.name)}</span>`:''}${esc(tagText(m))}</span>
          <span class="idx-lead"></span><span class="idx-count">${m.months}개월 · 댓글 ${m.commentCount}</span></div>
        ${m.desc?`<p class="idx-desc">${esc(m.desc)}</p>`:''}
      </div>`).join('') + `</div>`;
  }
  return `<div class="wrap page"><div class="list-head">
      <div class="note">카테고리별로, 지금도 댓글이 이어지는 순서대로 모았습니다.</div>${seg}
    </div>${cats}${body}</div>`;
}

function pageDetail() {
  const m = findCard(state.selectedId);
  if (!m) return `<div class="wrap-narrow page"><button class="back" data-act="backList">← 목록으로</button></div>`;
  const reg = m.status === 'new' ? (m.days === 0 ? '오늘 등록' : `등록 ${m.days}일 전`) : `등록 ${m.months}개월 전`;
  const total = m.voteYes + m.voteNo;
  const yesPct = total ? Math.round(m.voteYes/total*100) : 0;
  const noPct = total ? 100 - yesPct : 0;
  const didVote = !!votedMap()[m.id];

  let clist;
  if (state.detailLoading) clist = `<div class="empty">댓글 불러오는 중…</div>`;
  else if (!state.detailComments.length) clist = `<div class="empty">첫 댓글을 남겨 보세요.</div>`;
  else clist = state.detailComments.map(c => {
    const user = !!c.is_user;
    return `<div class="citem">
      ${user ? `<div class="avatar user">${esc((c.nick||'?').slice(0,1))}</div>` : `<div class="avatar anon"></div>`}
      <div class="col"><div class="cmeta">
          <span class="cnick ${user?'user':'anon'}">${esc(c.nick)}</span>
          ${user ? `<span class="badge user">로그인</span>` : `<span class="badge anon">익명</span>`}
          <span class="cwhen">${esc(timeAgo(c.created_at))}</span>
        </div><p class="ctext">${esc(c.body)}</p></div>
    </div>`;
  }).join('');

  const authRow = state.user ? `<span class="who">${esc(state.user.name)} · <button class="linkbtn" data-act="logout">로그아웃</button></span>` : '';
  const loginBlock = state.user ? '' : `<div class="auth">
      <input class="nick" data-field="nick" value="${esc(state.draftNick)}" placeholder="닉네임 (선택)" />
      <span class="or">또는</span>
      <button class="google" data-act="loginGoogle">Google 계정으로 로그인</button></div>`;
  const reportBlock = state.reported
    ? `<span class="report-done">신고가 접수되었습니다. 검토 후 반영됩니다.</span>`
    : `<button class="report-btn" data-act="report">이 항목 신고</button>`;

  return `<div class="wrap-narrow page">
    <button class="back" data-act="backList">← 목록으로</button>
    <div class="detail">
      ${m.photo ? photoSlot('detail-media','사진 / 동영상') : ''}
      ${m.name ? `<div class="headword">${esc(m.name)}</div>` : ''}
      <div class="tag-head">${esc(tagText(m))}</div>
      <div class="reg">${reg}${m.src ? ` · 출처 <a href="#">${esc(m.src)}</a>` : ''}</div>
      ${m.desc ? `<p class="detail-desc">${esc(m.desc)}</p>` : ''}

      <div class="vote">
        <div class="vote-row">
          <span class="vote-q">지금도 웃겨?</span>
          <div class="vote-btns ${didVote?'voted':''}">
            <button class="vote-btn" data-act="voteYes">예</button>
            <button class="vote-btn" data-act="voteNo">아니</button>
          </div>
          <span class="vote-total">${total}표 참여</span>
        </div>
        <div class="vote-bar"><div style="width:${yesPct}%"></div></div>
        <div class="vote-legend"><span>예 ${yesPct}% · ${m.voteYes}표</span><span>아니 ${noPct}% · ${m.voteNo}표</span></div>
      </div>

      <div class="comments">
        <div class="comments-head"><h3>댓글 ${m.commentCount}</h3>${authRow}</div>
        <div class="cform">${loginBlock}
          <textarea data-field="text" placeholder="이 밈에 대해 한마디 남겨 보세요">${esc(state.draftText)}</textarea>
          <div class="submit-row"><button class="btn-solid" data-act="submit">등록</button></div>
        </div>
        <div class="clist">${clist}</div>
        <div class="report-wrap">${reportBlock}</div>
      </div>
    </div></div>`;
}

// ─── 메인 렌더 ──────────────────────────────────────
function draw() {
  if (state.loading) { app.innerHTML = masthead() + `<div class="wrap page"><div class="empty">불러오는 중…</div></div>`; return; }
  if (state.error) { app.innerHTML = masthead() + `<div class="wrap page"><div class="empty">데이터를 불러올 수 없습니다.<br>${esc(state.error)}</div></div>`; return; }
  let html = masthead();
  if (state.page !== 'detail') {
    html += deckSection() + tabs();
    html += state.page === 'new' ? pageNew() : pageSteady();
  } else html += pageDetail();
  app.innerHTML = html;
  attachDeck();
}

// ─── 액션 ───────────────────────────────────────────
function go(page) { setState({ page, selectedId: null, reported: false }); }
async function openDetail(id) {
  const from = (state.page === 'new' || state.page === 'steady') ? state.page : state.lastList;
  setState({ page: 'detail', selectedId: id, reported: false, lastList: from, draftText: '', draftNick: '', detailComments: [], detailLoading: true });
  try {
    const rows = await sbGet(`meme_comments?meme_id=eq.${Number(id)}&select=nick,body,is_user,created_at&order=created_at.desc`);
    setState({ detailComments: rows, detailLoading: false });
  } catch (e) { setState({ detailLoading: false }); }
}
async function vote(dir) {
  const id = state.selectedId;
  if (!id || votedMap()[id]) return;
  markVoted(id, dir); // 낙관적 잠금
  const card = findCard(id);
  if (card) { if (dir === 'yes') card.voteYes++; else card.voteNo++; }
  draw();
  try {
    await sbPost('meme_votes', { meme_id: Number(id), voter_id: voterId(), choice: dir }, 'return=minimal');
  } catch (e) { /* 이미 투표(409) 등은 표시만 유지 */ }
}
async function submitComment() {
  const id = state.selectedId;
  const text = (state.draftText || '').trim();
  if (!id || !text) return;
  const isUser = !!state.user;
  const nick = isUser ? state.user.name : ((state.draftNick || '').trim() || '익명');
  try {
    const inserted = await sbPost('meme_comments', { meme_id: Number(id), nick, body: text, is_user: isUser });
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    const card = findCard(id); if (card) card.commentCount++;
    setState({ detailComments: [row, ...state.detailComments], draftText: '' });
  } catch (e) { alert('댓글 등록 실패: ' + e.message); }
}

// 덱 스와이프
function commitNext() {
  const ni = state.deckIndex + 1;
  if (ni >= newCards().length) setState({ deckDone: true }); else setState({ deckIndex: ni });
}
function flyAndAdvance(el, dir) { el.style.transition = 'transform .23s ease'; el.style.transform = `translate(${dir*720}px,0) rotate(${dir*30}deg)`; setTimeout(commitNext, 230); }
function attachDeck() {
  const top = app.querySelector('.deck-card[data-top="1"]');
  if (!top) return;
  top.addEventListener('pointerdown', (e) => {
    const startX = e.clientX; let moved = 0; top.style.transition = 'none';
    const move = (ev) => { const dx = ev.clientX - startX; moved = Math.max(moved, Math.abs(dx)); top.style.transform = `translate(${dx}px,0) rotate(${dx/24}deg)`; };
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 110) flyAndAdvance(top, dx > 0 ? 1 : -1);
      else if (moved < 6) openDetail(top.dataset.id);
      else { top.style.transition = 'transform .24s ease'; top.style.transform = 'translate(0,0)'; }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
}

// ─── 이벤트 위임 ────────────────────────────────────
const ACTIONS = {
  goNew: () => go('new'), goSteady: () => go('steady'), backList: () => go(state.lastList),
  newVarA: () => setState({ newVariant: 'a' }), newVarB: () => setState({ newVariant: 'b' }),
  steadyVarA: () => setState({ steadyVariant: 'a' }), steadyVarB: () => setState({ steadyVariant: 'b' }),
  setCat: (id) => setState({ steadyCat: id }),
  open: (id) => openDetail(id),
  voteYes: () => vote('yes'), voteNo: () => vote('no'), submit: () => submitComment(),
  loginGoogle: () => setState({ user: { name: '독자' + (10 + Math.floor(Math.random()*89)) } }),
  logout: () => setState({ user: null }), report: () => setState({ reported: true }),
  deckPass: () => commitNext(),
  deckPrev: () => { if (state.deckDone) return setState({ deckDone: false, deckIndex: Math.max(0, newCards().length - 1) }); if (state.deckIndex > 0) setState({ deckIndex: state.deckIndex - 1 }); },
  resetDeck: () => setState({ deckDone: false, deckIndex: 0 }),
};
app.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (!el) return; const fn = ACTIONS[el.dataset.act]; if (fn) fn(el.dataset.id); });
app.addEventListener('input', (e) => {
  const f = e.target.dataset.field;
  if (f === 'nick') setState({ draftNick: e.target.value }, false);
  else if (f === 'text') setState({ draftText: e.target.value }, false);
});
window.addEventListener('resize', () => { const narrow = window.innerWidth < 720; if (narrow !== state.narrow) setState({ narrow }); });

draw();
init();
