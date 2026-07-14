// 탈퇴 페이지 — 로그인 사용자의 댓글·회원정보를 삭제하고 로그아웃.
// (auth.users 계정 자체의 완전 삭제는 service_role이 필요 → Edge Function으로 확장 가능)
const SB = window.__SB__ || { url: '', key: '' };
const root = document.getElementById('withdraw');
let user = null;

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function box(inner) {
  return `<div class="admin-wrap" style="max-width:520px">
    <h1 style="font-family:var(--serif);font-size:24px;margin:0">탈퇴</h1>
    <div style="margin-top:22px">${inner}</div>
    <p style="margin-top:28px"><a href="/">← 메인으로</a></p>
  </div>`;
}

async function draw() {
  if (!SB.url || !SB.key) { root.innerHTML = box('config.js 없음'); return; }
  user = await window.mmdAuth.whoami();
  if (!user) {
    root.innerHTML = box(`<p style="color:var(--mute)">로그인 후 이용할 수 있습니다.</p><button class="btn-solid" id="login">Google 로그인</button>`);
    document.getElementById('login').onclick = () => window.mmdAuth.login();
    return;
  }
  root.innerHTML = box(`
    <p><b>${esc(user.email)}</b> 계정</p>
    <p style="color:var(--mute);font-size:14px;line-height:1.7">탈퇴하면 작성한 <b>댓글과 회원 정보가 삭제</b>되고 로그아웃됩니다. 이 작업은 되돌릴 수 없습니다.</p>
    <button class="btn-solid" style="background:#c0392b" id="go">탈퇴하기</button>
    <span id="msg" style="margin-left:12px;font-size:13px;color:var(--mute)"></span>`);
  document.getElementById('go').onclick = withdraw;
}

async function withdraw() {
  if (!confirm('정말 탈퇴하시겠습니까? 작성한 댓글과 회원 정보가 삭제됩니다.')) return;
  const msg = document.getElementById('msg'); msg.textContent = '처리 중…';
  try {
    const h = window.mmdAuth.headers({ Prefer: 'return=minimal' });
    await fetch(`${SB.url}/rest/v1/meme_comments?user_id=eq.${user.id}`, { method: 'DELETE', headers: h });
    await fetch(`${SB.url}/rest/v1/profiles?id=eq.${user.id}`, { method: 'DELETE', headers: h });
    localStorage.removeItem('mmd-token'); // 로그아웃(토큰 제거)
    root.innerHTML = box(`<p>탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.</p>`);
  } catch (e) { msg.textContent = '실패: ' + e.message; }
}

draw();
