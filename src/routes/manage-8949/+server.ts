// 관리자 진입 — 추측하기 어려운 경로로 숨김(구 /admin.html 대체).
// 에셋(config/auth/admin.js·style.css)은 static/에 그대로 있고 루트 절대경로로 로드된다.
// noindex로 검색 색인 차단. 실제 쓰기 권한은 Google 로그인 + 관리자 이메일 + RLS가 최종 방어.
import type { RequestHandler } from './$types';

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>memedics · 관리자</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <style>
    .admin-wrap { max-width: 920px; margin: 0 auto; padding: 40px 24px 100px; }
    .admin-head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:24px; }
    .admin-head h1 { font-family:var(--serif); font-size:26px; margin:0; }
    .admin-tabs { display:flex; gap:24px; margin-bottom:20px; }
    .admin-tabs button { background:none; border:none; font-size:15px; color:var(--mute2); padding:6px 0 10px; border-bottom:2px solid transparent; }
    .admin-tabs button.on { color:var(--ink); border-bottom-color:var(--accent); }
    .adm-row { border:1px solid var(--line); background:#fff; padding:14px 16px; margin-bottom:10px; }
    .adm-row .t { font-size:15px; color:var(--ink2); }
    .adm-row .m { font-size:12px; color:var(--mute3); margin-top:4px; }
    .adm-actions { display:flex; gap:8px; margin-top:10px; }
    .field { margin-bottom:12px; }
    .field label { display:block; font-size:12px; color:var(--mute); margin-bottom:4px; }
    .field input, .field textarea, .field select { width:100%; border:1px solid var(--line2); padding:9px 11px; font-family:var(--sans); font-size:14px; background:#FCFCFA; color:var(--ink); }
    .field textarea { min-height:70px; resize:vertical; }
    .hint { font-size:11px; color:var(--mute3); margin-top:3px; }
    .center { text-align:center; padding:80px 0; }
    .status-msg { font-size:13px; color:var(--accent); margin-left:10px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .searchbar { margin-bottom:16px; }
    .badge-done { color:var(--accent); } .badge-todo { color:#c0392b; }
    .media-up { font-size:12px; color:var(--accent); margin:6px 0; min-height:16px; }
    .media-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .media-cell { position:relative; width:96px; height:96px; border:1px solid var(--line); border-radius:6px; overflow:hidden; }
    .media-cell img, .media-cell video { width:100%; height:100%; object-fit:cover; display:block; }
    .media-cell-x { position:absolute; top:2px; right:2px; width:20px; height:20px; border:none; border-radius:50%; background:rgba(0,0,0,.6); color:#fff; font-size:12px; line-height:20px; cursor:pointer; padding:0; }
    .cover-badge { position:absolute; bottom:2px; left:2px; background:var(--accent,#c0392b); color:#fff; font-size:10px; padding:1px 5px; border-radius:3px; }
  </style>
</head>
<body>
  <div id="admin"></div>
  <script src="/config.js"></script>
  <script src="/auth.js"></script>
  <script src="/admin.js"></script>
</body>
</html>`;

// prerender 금지: 프리렌더하면 확장자 없는 정적 파일(manage-8949)로 떨어져
// Vercel이 octet-stream으로 서빙 → 브라우저가 렌더 대신 '다운로드'해버린다.
// 서버리스로 응답해야 런타임에 content-type: text/html 헤더가 붙어 정상 렌더됨.
export const prerender = false;

export const GET: RequestHandler = () =>
  new Response(HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
