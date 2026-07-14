// 밈 사전 — Claude Design 프로토타입의 바닐라 이식.
// 원 디자인(DCLogic/x-dc)을 프레임워크 없이 재현. 데이터/투표/댓글은 프로토타입처럼
// localStorage에 저장(목업). 실 백엔드(memes 테이블·mention_counts) 연결은 다음 단계.

// ─── 데이터 (프로토타입 시드) ───────────────────────
const NEW = [
  { id:'n0', name:'', tags:['#무제','#반응짤','#상황'], desc:'제목 없이 반응만 캡처해 올라온 짤. 상황에 따라 다양하게 갖다 쓴다.', src:'', photo:true, days:1 },
  { id:'n1', name:'스킬이슈', tags:['#실력','#게임','#자조'], desc:'결과가 나쁠 때 장비나 상황이 아니라 본인 실력 문제라고 짚는 말.', src:'온라인 커뮤니티', photo:true, days:2 },
  { id:'n2', name:'폼 미쳤다', tags:['#칭찬','#컨디션'], desc:'컨디션이나 결과물이 유난히 좋을 때 감탄하듯 쓰는 표현.', src:'', photo:false, days:3 },
  { id:'n3', name:'그건 좀', tags:['#애매','#완곡'], desc:'대놓고 반대하긴 뭣할 때 말끝을 흐리며 애매함을 드러내는 말.', src:'', photo:false, days:5 },
  { id:'n4', name:'알잘딱', tags:['#줄임말','#직장'], desc:'"알아서 잘 딱 깔끔하게"의 줄임말. 세세한 지시 없이 처리한다는 뜻.', src:'온라인 커뮤니티', photo:true, days:6 },
  { id:'n5', name:'오히려 좋아', tags:['#긍정','#역발상'], desc:'불리해 보이는 상황을 굳이 긍정적으로 뒤집어 받아들이는 말.', src:'', photo:false, days:9 },
];
const STEADY = [
  { id:'s1', name:'갓생', cat:'일반인', tags:['#자기관리','#생활'], desc:'부지런하고 계획적으로 사는 삶. 자기관리가 철저한 하루를 가리킨다.', src:'', photo:false, months:14 },
  { id:'s5', name:'럭키비키', cat:'가수', tags:['#긍정','#낙관'], desc:'사소한 행운도 크게 긍정하며 받아들이는 낙관적인 태도.', src:'', photo:false, months:11 },
  { id:'s6', name:'무야호', cat:'무한도전', tags:['#환호','#기쁨'], desc:'예상치 못한 순간에 터져 나온 환호. 신남을 표현할 때 두루 쓰인다.', src:'예능 방송', photo:true, months:40 },
  { id:'s4', name:'중꺾마', cat:'일반인', tags:['#의지','#줄임말'], desc:'"중요한 건 꺾이지 않는 마음"의 줄임말. 어려운 상황에서 의지를 다질 때.', src:'스포츠 중계', photo:false, months:26 },
  { id:'s2', name:'킹받네', cat:'일반인', tags:['#감정','#강조'], desc:'"열받네"에 강조 접두어를 붙인 형태. 약이 오르는 감정을 과장해 표현.', src:'', photo:true, months:22 },
  { id:'s7', name:'플렉스', cat:'래퍼', tags:['#과시','#힙합'], desc:'가진 것을 거리낌 없이 드러내는 태도. 소비나 자랑을 가리키기도 한다.', src:'', photo:false, months:34 },
  { id:'s8', name:'스웨그', cat:'래퍼', tags:['#힙합','#태도'], desc:'자기만의 멋과 여유를 뽐내는 분위기를 이르는 말.', src:'', photo:false, months:38 },
  { id:'s9', name:'인생명장면', cat:'배우', tags:['#명대사','#드라마'], desc:'오래 회자되는 드라마·영화 속 한 장면을 가리키는 표현.', src:'', photo:false, months:28 },
  { id:'s3', name:'어쩔수없지', cat:'일반인', tags:['#체념','#수용'], desc:'바꿀 수 없는 상황을 담담하게 받아들이며 넘어가는 말.', src:'', photo:false, months:30 },
  { id:'s10', name:'노잼', cat:'외국', tags:['#해외밈','#반응'], desc:'재미없음을 뜻하는 말. 해외 반응 짤과 함께 번지며 굳어졌다.', src:'', photo:false, months:24 },
  { id:'s11', name:'이거레알', cat:'외국', tags:['#해외밈','#진위'], desc:'"이거 진짜야?"라는 반응. 해외 짤과 함께 쓰이며 퍼졌다.', src:'', photo:false, months:17 },
];
const CATS = ['전체','무한도전','래퍼','가수','배우','일반인','외국'];
const ALL = NEW.concat(STEADY);

const SEED_COMMENTS = {
  n1:[{id:'c11',nick:'지나가던독자',text:'요즘 게임할 때마다 듣는 말 ㅋㅋ',when:'어제',user:false},{id:'c12',nick:'김편집',text:'출처가 어느 방송이었는지 아시는 분?',when:'2일 전',user:true}],
  n2:[{id:'c21',nick:'초코',text:'칭찬인지 놀리는 건지 헷갈릴 때가 있음',when:'1일 전',user:false}],
  n4:[{id:'c41',nick:'박기록',text:'직장에서 은근히 자주 씀',when:'3일 전',user:true}],
  s1:[{id:'g11',nick:'매일아침',text:'몇 년째 새해 목표에 등장하는 단어',when:'5시간 전',user:false},{id:'g12',nick:'이정리',text:'설명이 담백해서 좋네요',when:'1일 전',user:true},{id:'g13',nick:'지나가던독자2',text:'아직도 살아있는 단어라는 게 신기',when:'2일 전',user:false}],
  s2:[{id:'k11',nick:'무민',text:'처음 봤을 때가 엊그제 같은데',when:'3시간 전',user:false},{id:'k12',nick:'박편집',text:'표기가 여러 개라 항목 정리가 애매하긴 함',when:'1일 전',user:true},{id:'k13',nick:'익명',text:'요즘도 단톡방에서 종종 봄',when:'2일 전',user:false}],
  s4:[{id:'j11',nick:'응원단',text:'경기 있을 때마다 다시 올라오는 듯',when:'6시간 전',user:false},{id:'j12',nick:'최기획',text:'맥락 설명이 잘 돼 있어서 처음 보는 사람도 이해될 듯',when:'1일 전',user:true},{id:'j13',nick:'지나가던독자3',text:'줄임말인 줄 몰랐음',when:'3일 전',user:false},{id:'j14',nick:'익명',text:'꾸준히 회자되는 이유가 있네',when:'4일 전',user:false}],
  s5:[{id:'v1',nick:'별빛',text:'긍정 에너지 뿜뿜',when:'2일 전',user:false}],
  s6:[{id:'v2',nick:'정선주민',text:'이 장면은 못 잊지',when:'5시간 전',user:false},{id:'v3',nick:'이편집',text:'클립 다시 봐도 웃김',when:'1일 전',user:true}],
  s7:[{id:'v4',nick:'힙합러',text:'요즘도 자주 들림',when:'3일 전',user:false}],
  s8:[{id:'v5',nick:'익명',text:'뜻이 넓어진 케이스',when:'2일 전',user:false}],
  s9:[{id:'v6',nick:'드라마덕',text:'그 장면 레전드',when:'6시간 전',user:false},{id:'v7',nick:'최기록',text:'명대사 정리 감사',when:'2일 전',user:true}],
  s10:[{id:'v8',nick:'해외짤러',text:'출처가 궁금',when:'1일 전',user:false}],
  s11:[{id:'v9',nick:'익명',text:'이거 진짜 오래됐네',when:'3일 전',user:false}],
  s3:[{id:'v10',nick:'담담',text:'가끔 필요한 말',when:'4일 전',user:false}],
};
const SEED_VOTES = {
  n0:{yes:5,no:1}, n1:{yes:12,no:5}, n2:{yes:20,no:3}, n3:{yes:6,no:9}, n4:{yes:8,no:2}, n5:{yes:15,no:4},
  s1:{yes:40,no:22}, s2:{yes:31,no:48}, s3:{yes:19,no:26}, s4:{yes:52,no:11}, s5:{yes:28,no:14},
  s6:{yes:60,no:14}, s7:{yes:33,no:20}, s8:{yes:29,no:18}, s9:{yes:41,no:12}, s10:{yes:22,no:19}, s11:{yes:18,no:15},
};

// ─── 상태 ───────────────────────────────────────────
let saved = null;
try { saved = JSON.parse(localStorage.getItem('meme-dict-v1') || 'null'); } catch (e) {}

const state = {
  page: 'new', lastList: 'new',
  newVariant: 'a', steadyVariant: 'a', steadyCat: '전체',
  selectedId: null,
  comments: (saved && saved.comments) || SEED_COMMENTS,
  votes: (saved && saved.votes) || SEED_VOTES,
  voted: (saved && saved.voted) || {},
  user: null, draftNick: '', draftText: '', reported: false,
  deckIndex: 0, deckDone: false,
  narrow: window.innerWidth < 720,
};

const app = document.getElementById('app');

function persist() {
  try {
    localStorage.setItem('meme-dict-v1', JSON.stringify({ comments: state.comments, votes: state.votes, voted: state.voted }));
  } catch (e) {}
}
function setState(patch, render = true) {
  Object.assign(state, patch);
  if (render) draw();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function count(id) { return (state.comments[id] || []).length; }
function tagText(m) { return (m.tags || []).join(' '); }

// ─── 조각 렌더 ──────────────────────────────────────
function photoSlot(cls, label) {
  return `<div class="photo-slot ${cls}">${label}</div>`;
}
function nameHtml(m, cls) {
  return m.name ? `<span class="m-name ${cls || ''}">${esc(m.name)}</span>` : '';
}

function masthead() {
  return `<div class="wrap masthead">
    <div class="eyebrow">Meme Dictionary</div>
    <h1>밈 사전</h1>
    <p class="lede">새로 뜬 밈과 오래 살아남은 밈을 모아 둡니다. 판정하지 않고, 있는 그대로 보여드립니다. 해석은 읽는 사람의 몫.</p>
    <div class="rule"></div>
  </div>`;
}

function deckSection() {
  const dlen = NEW.length;
  let cards = '';
  if (!state.deckDone) {
    for (let off = 2; off >= 0; off--) {
      const idx = state.deckIndex + off;
      if (idx >= dlen) continue;
      const m = NEW[idx];
      const top = off === 0;
      const z = 30 - off;
      const transform = top ? 'translate(0,0)' : `translateY(${off*14}px) scale(${(1-off*0.045).toFixed(3)})`;
      const shadow = top ? '0 14px 32px rgba(20,60,64,0.16)' : '0 4px 14px rgba(0,0,0,0.05)';
      cards += `<div class="deck-card" data-top="${top?1:0}" data-id="${m.id}"
        style="z-index:${z};transform:${transform};box-shadow:${shadow};cursor:${top?'grab':'default'};transition:transform .24s ease;">
        ${m.photo ? photoSlot('', '사진 / 동영상') : ''}
        <div class="card-body">
          ${nameHtml(m)}
          <div class="m-tags">${esc(tagText(m))}</div>
          <p class="m-desc">${esc(m.desc)}</p>
          <div class="spacer"></div>
          <div class="m-meta">${m.days}일 전 등록 · 댓글 ${count(m.id)}개</div>
        </div>
      </div>`;
    }
  }
  const done = state.deckDone ? `<div class="deck-done">
      <span>새로 뜬 밈을 다 넘겨봤어요</span>
      <button class="btn-accent" data-act="resetDeck">처음부터 다시</button>
    </div>` : '';
  const counter = `${Math.min(state.deckIndex + 1, dlen)} / ${dlen}`;
  return `<div class="wrap deck-section">
    <div class="deck-title">넘겨보기 · 새로 뜬 밈</div>
    <div class="deck-holder">
      <div class="deck-stage">${cards}${done}</div>
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
  return `<div class="wrap">
    <div class="tabs">
      <button class="tab ${state.page==='new'?'active':''}" data-act="goNew">새로 올라온</button>
      <button class="tab ${state.page==='steady'?'active':''}" data-act="goSteady">스테디</button>
    </div>
  </div>`;
}

function metaNew(m) { return `${m.days}일 전 등록 · 댓글 ${count(m.id)}개`; }
function metaSteady(m) { return `등록 ${m.months}개월 전 · 최근 댓글 ${count(m.id)}개`; }

function pageNew() {
  const a = state.newVariant === 'a';
  const seg = `<div class="seg">
      <button class="${a?'on':''}" data-act="newVarA">목록형</button>
      <button class="${!a?'on':''}" data-act="newVarB">카드형</button>
    </div>`;
  let body;
  if (a) {
    body = `<div class="rows">` + NEW.map(m => `
      <div class="row" data-act="open" data-id="${m.id}">
        <div class="col">
          <div class="rowline">${nameHtml(m)}<span class="m-tags">${esc(tagText(m))}</span></div>
          <p class="m-desc">${esc(m.desc)}</p>
          <div class="m-meta">${metaNew(m)}</div>
        </div>
        ${m.photo ? photoSlot('thumb','사진') : ''}
      </div>`).join('') + `</div>`;
  } else {
    body = `<div class="cards">` + NEW.map(m => `
      <div class="card" data-act="open" data-id="${m.id}">
        ${m.photo ? photoSlot('cardphoto','사진 / 동영상') : ''}
        ${nameHtml(m)}
        <div class="m-tags">${esc(tagText(m))}</div>
        <p class="m-desc">${esc(m.desc)}</p>
        <div class="spacer"></div>
        <div class="foot">${metaNew(m)}</div>
      </div>`).join('') + `</div>`;
  }
  return `<div class="wrap page">
    <div class="list-head">
      <div class="count">최근 등록순 · ${NEW.length}개 항목</div>
      ${seg}
    </div>${body}
  </div>`;
}

function pageSteady() {
  const a = state.steadyVariant === 'a';
  const seg = `<div class="seg">
      <button class="${a?'on':''}" data-act="steadyVarA">사전형</button>
      <button class="${!a?'on':''}" data-act="steadyVarB">색인형</button>
    </div>`;
  const cats = `<div class="cats">` + CATS.map(c =>
    `<button class="cat ${state.steadyCat===c?'on':''}" data-act="setCat" data-id="${c}">${esc(c)}</button>`).join('') + `</div>`;
  const list = state.steadyCat === '전체' ? STEADY : STEADY.filter(m => m.cat === state.steadyCat);
  let body;
  if (a) {
    body = `<div class="rows">` + list.map((m,i) => `
      <div class="dict-row" data-act="open" data-id="${m.id}">
        <div class="dict-idx">${String(i+1).padStart(2,'0')}</div>
        <div class="col">
          <div class="dict-head">${nameHtml(m)}<span class="m-tags">${esc(tagText(m))}</span></div>
          <p class="m-desc" style="font-size:14px;margin:5px 0 0;">${esc(m.desc)}</p>
          <div class="m-meta">${metaSteady(m)}</div>
        </div>
      </div>`).join('') + `</div>`;
  } else {
    body = `<div style="border-top:1px solid var(--line);padding-top:6px;">` + list.map(m => `
      <div class="idx-row" data-act="open" data-id="${m.id}">
        <div class="idx-line">
          <span class="idx-term">${m.name?`<span class="nm">${esc(m.name)}</span>`:''}${esc(tagText(m))}</span>
          <span class="idx-lead"></span>
          <span class="idx-count">${m.months}개월 · 댓글 ${count(m.id)}</span>
        </div>
        <p class="idx-desc">${esc(m.desc)}</p>
      </div>`).join('') + `</div>`;
  }
  return `<div class="wrap page">
    <div class="list-head">
      <div class="note">카테고리별로, 지금도 댓글이 이어지는 순서대로 모았습니다.</div>
      ${seg}
    </div>${cats}${body}
  </div>`;
}

function pageDetail() {
  const m = ALL.find(x => x.id === state.selectedId);
  if (!m) return `<div class="wrap-narrow page"><button class="back" data-act="backList">← 목록으로</button></div>`;
  const isNew = NEW.some(x => x.id === m.id);
  const reg = isNew ? `등록 ${m.days}일 전` : `등록 ${m.months}개월 전`;
  const v = state.votes[m.id] || { yes:0, no:0 };
  const total = v.yes + v.no;
  const yesPct = total ? Math.round(v.yes/total*100) : 0;
  const noPct = total ? 100 - yesPct : 0;
  const didVote = !!state.voted[m.id];

  const cs = (state.comments[m.id] || []).map(c => {
    const anon = !c.user;
    return `<div class="citem">
      ${c.user ? `<div class="avatar user">${esc((c.nick||'?').slice(0,1))}</div>` : `<div class="avatar anon"></div>`}
      <div class="col">
        <div class="cmeta">
          <span class="cnick ${c.user?'user':'anon'}">${esc(c.nick)}</span>
          ${c.user ? `<span class="badge user">로그인</span>` : `<span class="badge anon">익명</span>`}
          <span class="cwhen">${esc(c.when)}</span>
        </div>
        <p class="ctext">${esc(c.text)}</p>
      </div>
    </div>`;
  }).join('');

  const authRow = state.user
    ? `<span class="who">${esc(state.user.name)} · <button class="linkbtn" data-act="logout">로그아웃</button></span>`
    : '';
  const loginBlock = state.user ? '' : `<div class="auth">
      <input class="nick" data-field="nick" value="${esc(state.draftNick)}" placeholder="닉네임 (선택)" />
      <span class="or">또는</span>
      <button class="google" data-act="loginGoogle">Google 계정으로 로그인</button>
    </div>`;
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
      <p class="detail-desc">${esc(m.desc)}</p>

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
        <div class="vote-legend"><span>예 ${yesPct}% · ${v.yes}표</span><span>아니 ${noPct}% · ${v.no}표</span></div>
      </div>

      <div class="comments">
        <div class="comments-head">
          <h3>댓글 ${count(m.id)}</h3>
          ${authRow}
        </div>
        <div class="cform">
          ${loginBlock}
          <textarea data-field="text" placeholder="이 밈에 대해 한마디 남겨 보세요">${esc(state.draftText)}</textarea>
          <div class="submit-row"><button class="btn-solid" data-act="submit">등록</button></div>
        </div>
        <div class="clist">${cs}</div>
        <div class="report-wrap">${reportBlock}</div>
      </div>
    </div>
  </div>`;
}

// ─── 메인 렌더 ──────────────────────────────────────
function draw() {
  let html = masthead();
  if (state.page !== 'detail') {
    html += deckSection() + tabs();
    html += state.page === 'new' ? pageNew() : pageSteady();
  } else {
    html += pageDetail();
  }
  app.innerHTML = html;
  attachDeck();
  // textarea 커서 유지: 상세에서 방금 입력 중이면 포커스 복원은 생략(재렌더 최소화 정책)
}

// ─── 액션 ───────────────────────────────────────────
function go(page) { setState({ page, selectedId: null, reported: false }); }
function openDetail(id) {
  const from = (state.page === 'new' || state.page === 'steady') ? state.page : state.lastList;
  setState({ page: 'detail', selectedId: id, reported: false, lastList: from, draftText: '', draftNick: '' });
}
function vote(dir) {
  const id = state.selectedId;
  if (!id || state.voted[id]) return;
  const votes = { ...state.votes };
  const cur = votes[id] || { yes:0, no:0 };
  votes[id] = { ...cur, [dir]: (cur[dir]||0) + 1 };
  setState({ votes, voted: { ...state.voted, [id]: dir } });
  persist();
}
function submitComment() {
  const id = state.selectedId;
  const text = (state.draftText || '').trim();
  if (!id || !text) return;
  const isUser = !!state.user;
  const nick = isUser ? state.user.name : ((state.draftNick || '').trim() || '익명');
  const c = { id: 'u'+Date.now(), nick, text, when: '방금 전', user: isUser };
  const list = (state.comments[id] || []).concat([c]);
  setState({ comments: { ...state.comments, [id]: list }, draftText: '' });
  persist();
}

// 덱 스와이프
function commitNext() {
  const ni = state.deckIndex + 1;
  if (ni >= NEW.length) setState({ deckDone: true });
  else setState({ deckIndex: ni });
}
function flyAndAdvance(topEl, dir) {
  topEl.style.transition = 'transform .23s ease';
  topEl.style.transform = `translate(${dir*720}px,0) rotate(${dir*30}deg)`;
  setTimeout(commitNext, 230);
}
function attachDeck() {
  const top = app.querySelector('.deck-card[data-top="1"]');
  if (!top) return;
  top.addEventListener('pointerdown', (e) => {
    const startX = e.clientX;
    let moved = 0;
    top.style.transition = 'none';
    const move = (ev) => {
      const dx = ev.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      top.style.transform = `translate(${dx}px,0) rotate(${dx/24}deg)`;
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 110) flyAndAdvance(top, dx > 0 ? 1 : -1);
      else if (moved < 6) openDetail(top.dataset.id);
      else { top.style.transition = 'transform .24s ease'; top.style.transform = 'translate(0,0)'; }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

// ─── 이벤트 위임 ────────────────────────────────────
const ACTIONS = {
  goNew: () => go('new'),
  goSteady: () => go('steady'),
  backList: () => go(state.lastList),
  newVarA: () => setState({ newVariant: 'a' }),
  newVarB: () => setState({ newVariant: 'b' }),
  steadyVarA: () => setState({ steadyVariant: 'a' }),
  steadyVarB: () => setState({ steadyVariant: 'b' }),
  setCat: (id) => setState({ steadyCat: id }),
  open: (id) => openDetail(id),
  voteYes: () => vote('yes'),
  voteNo: () => vote('no'),
  submit: () => submitComment(),
  loginGoogle: () => setState({ user: { name: '독자' + (10 + Math.floor(Math.random()*89)) } }),
  logout: () => setState({ user: null }),
  report: () => setState({ reported: true }),
  deckPass: () => commitNext(),
  deckPrev: () => {
    if (state.deckDone) return setState({ deckDone: false, deckIndex: NEW.length - 1 });
    if (state.deckIndex > 0) setState({ deckIndex: state.deckIndex - 1 });
  },
  resetDeck: () => setState({ deckDone: false, deckIndex: 0 }),
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el.dataset.id);
});
// 입력은 재렌더 없이 상태만 갱신(포커스 유지)
app.addEventListener('input', (e) => {
  const f = e.target.dataset.field;
  if (f === 'nick') setState({ draftNick: e.target.value }, false);
  else if (f === 'text') setState({ draftText: e.target.value }, false);
});
window.addEventListener('resize', () => {
  const narrow = window.innerWidth < 720;
  if (narrow !== state.narrow) setState({ narrow });
});

draw();
