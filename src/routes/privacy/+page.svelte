<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>개인정보처리방침 — memedics</title>
  <meta name="description" content="memedics 개인정보처리방침 — 수집 항목, 이용 목적, 보관·파기, 제3자 제공, 이용자 권리." />
  <link rel="canonical" href="{page.url.origin}/privacy" />
</svelte:head>

<div class="wrap-narrow legal">
  <a class="back" href="/" style="border:none">← 홈으로</a>
  <h1>개인정보처리방침</h1>
  <p class="updated">최종 개정일: 2026-07-15</p>

  <p class="lead">
    memedics(이하 “서비스”)는 이용자의 개인정보를 소중히 다루며, 아래와 같이 처리합니다.
    이 방침은 서비스가 실제로 수집·이용하는 정보에 근거해 작성되었습니다.
  </p>

  <h2>1. 수집하는 항목</h2>
  <ul>
    <li><strong>Google 로그인 시</strong>: Google 계정의 이름, 이메일 주소, 프로필 식별자.
      (로그인은 선택이며, 하지 않아도 열람·투표·익명 댓글이 가능합니다.)</li>
    <li><strong>댓글 작성 시</strong>: 닉네임과 댓글 내용. 로그인한 경우 계정 식별자가 함께 저장되어
      본인 댓글 관리에 사용됩니다.</li>
    <li><strong>투표 시</strong>: 중복 투표 방지를 위한 익명 식별자(브라우저 localStorage에 생성)와
      선택한 항목. 이름·이메일 등 개인 식별정보는 저장하지 않습니다.</li>
  </ul>

  <h2>2. 이용 목적</h2>
  <ul>
    <li>로그인 이용자 식별 및 본인 댓글의 수정·삭제 제공</li>
    <li>댓글 표시 및 부적절한 이용 방지</li>
    <li>투표 중복 방지 및 활성도 게이지 집계</li>
  </ul>

  <h2>3. 보관 및 파기</h2>
  <p>
    개인정보는 목적 달성 또는 이용자의 삭제·탈퇴 요청 시까지 보관합니다.
    로그인 이용자는 <a href="/withdraw.html">탈퇴 페이지</a>에서 계정 연동 데이터의 삭제를 요청할 수 있습니다.
    투표 익명 식별자는 이용자가 브라우저 데이터를 지우면 함께 사라집니다.
  </p>

  <h2>4. 제3자 처리 위탁</h2>
  <ul>
    <li><strong>Supabase</strong> — 데이터베이스 저장 및 인증 처리(호스팅).</li>
    <li><strong>Google</strong> — 소셜 로그인(OAuth) 인증.</li>
  </ul>
  <p>서비스는 위 목적 외에 개인정보를 외부에 판매하거나 광고 목적으로 제공하지 않습니다.</p>

  <h2>5. 이용자의 권리</h2>
  <p>
    이용자는 언제든 자신의 개인정보 열람·정정·삭제 및 처리 정지를 요청할 수 있습니다.
    요청은 아래 연락처로 접수합니다.
  </p>

  <h2>6. 문의</h2>
  <p>개인정보 관련 문의: <a href="mailto:jamm2ic@gmail.com">jamm2ic@gmail.com</a></p>
</div>
