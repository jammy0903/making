/* ===== app.js — 화면·라우팅·데이터 연결 ===== */
/* 뷰: home / topic / worldcup / result / dragrank. 상태 기반 렌더링. */

(function (global) {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $("#app");

  // ---- 유틸 ----
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function reducedMotion() {
    return global.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.hidden = true; }, 300);
    }, 2200);
  }
  function confetti() {
    if (reducedMotion()) return;
    var wrap = document.createElement("div");
    wrap.className = "confetti";
    var colors = ["#6d5efc", "#ff5fa2", "#34d399", "#f5a524", "#a45cff"];
    for (var i = 0; i < 80; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.transform = "translateY(0) rotate(" + Math.random() * 360 + "deg)";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 3200);
  }

  // ---- 데이터 ----
  var topics = [];
  var EMOJIS = ["🎯", "🎬", "🍪", "🌟", "✅", "🎮", "📚", "🍜", "✈️", "🎵", "🏆", "🐣"];
  // 제목 키워드 → 이모지. 위에서부터 먼저 걸리는 것 사용(더 구체적인 걸 앞에).
  var EMOJI_RULES = [
    [["영화", "드라마", "애니", "시리즈", "넷플"], "🎬"],
    [["노래", "음악", "플레이리스트", "곡", "앨범", "가수"], "🎵"],
    [["책", "독서", "소설", "도서", "만화", "웹툰"], "📚"],
    [["게임", "겜"], "🎮"],
    [["여행", "여행지", "나라", "도시", "명소", "국가"], "✈️"],
    [["커피", "카페", "음료"], "☕"],
    [["술", "맥주", "와인", "칵테일", "소주"], "🍺"],
    [["간식", "과자", "디저트", "빵", "케이크"], "🍪"],
    [["음식", "맛집", "메뉴", "먹", "밥", "식당", "요리", "반찬"], "🍜"],
    [["운동", "헬스", "홈트", "요가", "러닝"], "💪"],
    [["할 일", "할일", "투두", "todo", "일정", "계획"], "✅"],
    [["버킷", "꿈", "목표", "소원", "위시"], "🌟"],
    [["선물", "쇼핑", "구매", "사고", "위시리스트"], "🛍️"],
    [["옷", "패션", "코디", "신발", "가방"], "👕"],
    [["강아지", "고양이", "반려", "펫", "동물"], "🐾"],
    [["공부", "단어", "스터디", "시험", "학습"], "📖"],
    [["색", "컬러", "color"], "🎨"],
    [["사진", "카메라", "포토"], "📷"],
    [["명언", "문장", "글귀"], "✍️"]
  ];
  function emojiFor(title) {
    var low = String(title).toLowerCase();
    for (var i = 0; i < EMOJI_RULES.length; i++) {
      var kws = EMOJI_RULES[i][0];
      for (var j = 0; j < kws.length; j++) {
        if (low.indexOf(kws[j]) !== -1) return EMOJI_RULES[i][1];
      }
    }
    // 매칭 없으면 제목 해시로 안정적으로 배정
    var h = 0;
    for (var k = 0; k < title.length; k++) h = (h + title.charCodeAt(k)) % EMOJIS.length;
    return EMOJIS[h];
  }
  function persist() {
    try { Store.saveAll(topics); }
    catch (e) { toast(e.message || "저장에 실패했어요."); }
  }
  function findTopic(id) {
    for (var i = 0; i < topics.length; i++) if (topics[i].id === id) return topics[i];
    return null;
  }

  function seed() {
    return [
      mkTopic("인생에 볼 영화", ["기생충", "인터스텔라", "라라랜드", "인셉션", "어바웃 타임", "타이타닉", "코코", "토이 스토리"]),
      mkTopic("이번 주 할 일", ["운동하기", "책 읽기", "친구 만나기", "방 청소", "밀린 이메일", "산책"]),
      mkTopic("먹어볼 간식", ["붕어빵", "호떡", "떡볶이", "마카롱", "약과", "탕후루", "크로플", "슈크림"])
    ];
  }
  function mkTopic(title, names) {
    return {
      id: Store.uid(),
      title: title,
      items: names.map(function (n) { return { id: Store.uid(), name: n, image: null }; }),
      results: []
    };
  }

  // ---- 상태/라우팅 ----
  var state = { route: "home", topicId: null, editingItemId: null };
  var wc = null;          // 진행 중인 Worldcup
  var pending = null;     // 방금 만든/열람 중인 결과 { title, mode, ranking, saved }
  var sortDestroy = null; // 드래그 정리 함수
  var runSeed = 1;

  function cleanup() {
    if (sortDestroy) { sortDestroy(); sortDestroy = null; }
  }

  function go(route, params) {
    cleanup();
    state.route = route;
    state.editingItemId = null;
    if (params && "topicId" in params) state.topicId = params.topicId;
    render();
    app.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function updateHeader() {
    var back = $("#back-btn");
    var showBack = state.route !== "home";
    back.hidden = !showBack;
    back.onclick = onBack;
  }
  function onBack() {
    if (state.route === "topic") go("home");
    else if (state.route === "worldcup") {
      if (confirm("월드컵을 그만두고 나갈까요? 진행 상황은 사라져요.")) go("topic");
    } else if (state.route === "dragrank") go("topic");
    else if (state.route === "result") {
      go("topic");
    } else go("home");
  }

  function render() {
    updateHeader();
    var html = "";
    if (state.route === "home") html = viewHome();
    else if (state.route === "topic") html = viewTopic();
    else if (state.route === "worldcup") html = viewWorldcup();
    else if (state.route === "result") html = viewResult();
    else if (state.route === "dragrank") html = viewDragrank();
    app.innerHTML = html;
    app.firstElementChild && app.firstElementChild.classList.add("view-enter");

    if (state.route === "home") wireHome();
    else if (state.route === "topic") wireTopic();
    else if (state.route === "worldcup") wireWorldcup();
    else if (state.route === "result") wireResult();
    else if (state.route === "dragrank") wireDragrank();
  }

  // =================== 홈 ===================
  function viewHome() {
    var totalResults = topics.reduce(function (s, t) { return s + t.results.length; }, 0);
    var list = topics.length
      ? '<div class="topic-grid">' + topics.map(function (t) {
          return (
            '<button class="topic-card" data-open="' + t.id + '">' +
            '<span class="topic-emoji">' + emojiFor(t.title) + "</span>" +
            '<span class="body">' +
            '<span class="title">' + esc(t.title) + "</span>" +
            '<span class="meta">항목 ' + t.items.length + "개" +
            (t.results.length ? " · 결과 " + t.results.length + "개" : "") + "</span>" +
            "</span><span class=\"chev\">›</span></button>"
          );
        }).join("") + "</div>"
      : '<div class="empty"><div class="big">🌱</div>아직 주제가 없어요.<br>첫 주제를 만들어보세요!</div>';

    return (
      "<div>" +
      '<div class="hero">' +
      "<h2>무엇이든 정해볼까요?</h2>" +
      "<p>고르고 배치하며 우선순위를 정하는 놀이터" +
      (totalResults ? " · 지금까지 " + totalResults + "번 정했어요 🎉" : "") + "</p>" +
      '<button class="btn btn-primary btn-lg" id="new-topic">+ 새 주제 만들기</button>' +
      "</div>" +
      '<div class="section-title"><h3>내 주제</h3><span class="muted">' + topics.length + "개</span></div>" +
      list +
      "</div>"
    );
  }
  function wireHome() {
    var nt = $("#new-topic");
    if (nt) nt.onclick = createTopic;
    Array.prototype.forEach.call(app.querySelectorAll("[data-open]"), function (b) {
      b.onclick = function () { go("topic", { topicId: b.getAttribute("data-open") }); };
    });
  }
  function createTopic() {
    var title = (prompt("주제 제목을 입력하세요\n예: 인생에 볼 영화, 이번 달 할 일") || "").trim();
    if (!title) return;
    var t = mkTopic(title, []);
    topics.unshift(t);
    persist();
    go("topic", { topicId: t.id });
  }

  // =================== 주제 상세 ===================
  function viewTopic() {
    var t = findTopic(state.topicId);
    if (!t) return '<div class="empty">주제를 찾을 수 없어요.</div>';
    var editing = state.editingItemId ? itemById(t, state.editingItemId) : null;

    var items = t.items.length
      ? '<div class="list-stack">' + t.items.map(function (it) {
          var thumb = it.image
            ? '<img class="item-thumb" src="' + esc(it.image) + '" alt="">'
            : '<div class="item-thumb placeholder">🎯</div>';
          return (
            '<div class="item-row">' + thumb +
            '<span class="name">' + esc(it.name) + "</span>" +
            '<button class="icon-btn" title="편집" data-edit="' + it.id + '" style="font-size:1.1rem">✏️</button>' +
            '<button class="icon-btn" title="삭제" data-del="' + it.id + '" style="font-size:1.1rem">🗑️</button>' +
            "</div>"
          );
        }).join("") + "</div>"
      : '<div class="empty" style="padding:18px">항목을 추가해 대결을 준비하세요.</div>';

    var results = t.results.length
      ? '<div class="list-stack">' + t.results.map(function (r) {
          return (
            '<button class="topic-card" data-result="' + r.id + '">' +
            '<span class="topic-emoji">' + (r.mode === "worldcup" ? "🏆" : "📊") + "</span>" +
            '<span class="body"><span class="title">' + (r.ranking[0] ? esc(r.ranking[0].name) : "결과") + " 1위</span>" +
            '<span class="meta">' + esc(r.modeLabel) + " · " + esc(r.dateLabel) + "</span></span>" +
            '<span class="chev">›</span></button>'
          );
        }).join("") + "</div>"
      : '<div class="empty" style="padding:14px">아직 저장된 결과가 없어요.</div>';

    var enough = t.items.length >= 2;

    return (
      "<div>" +
      '<div class="row spread mb"><h2 style="margin:0;font-size:1.35rem">' +
      emojiFor(t.title) + " " + esc(t.title) + "</h2>" +
      '<button class="btn btn-danger" id="del-topic">주제 삭제</button></div>' +

      '<div class="section-title"><h3>정하기 모드</h3></div>' +
      '<div class="mode-grid">' +
      '<button class="mode-card" id="mode-wc"' + (enough ? "" : " disabled") + '>' +
      '<div class="ico">🥊</div><div class="t">이상형 월드컵</div><div class="d">2중 1택 토너먼트</div></button>' +
      '<button class="mode-card alt" id="mode-drag"' + (enough ? "" : " disabled") + '>' +
      '<div class="ico">✋</div><div class="t">드래그 배치</div><div class="d">끌어서 순위 매기기</div></button>' +
      "</div>" +
      (enough ? "" : '<p class="muted center mt">항목이 2개 이상이면 시작할 수 있어요.</p>') +

      '<div class="section-title"><h3>항목</h3><span class="muted">' + t.items.length + "개</span></div>" +
      itemForm(editing) +
      '<div class="mt">' + items + "</div>" +

      '<div class="section-title"><h3>저장된 결과</h3><span class="muted">' + t.results.length + "개</span></div>" +
      results +
      "</div>"
    );
  }

  function itemForm(editing) {
    var name = editing ? esc(editing.name) : "";
    var img = editing && editing.image ? editing.image : "";
    var preview = img
      ? '<img id="if-thumb" class="item-thumb" src="' + esc(img) + '" alt="">'
      : '<div id="if-thumb" class="item-thumb placeholder">🎯</div>';
    return (
      '<div class="card">' +
      '<div class="row" style="gap:12px">' + preview +
      '<input class="input grow" id="if-name" placeholder="항목 이름" value="' + name + '" maxlength="60">' +
      "</div>" +
      '<div class="row wrap mt" style="gap:8px">' +
      '<input class="input grow" id="if-url" placeholder="이미지 URL (선택)" value="' +
        (img && img.indexOf("data:") !== 0 ? esc(img) : "") + '">' +
      '<label class="chip" style="cursor:pointer">📁 파일<input type="file" id="if-file" accept="image/*" hidden></label>' +
      "</div>" +
      '<input type="hidden" id="if-data" value="' + (img && img.indexOf("data:") === 0 ? esc(img) : "") + '">' +
      '<div class="row mt" style="gap:8px">' +
      '<button class="btn btn-primary grow" id="if-save">' + (editing ? "수정 저장" : "+ 항목 추가") + "</button>" +
      (editing ? '<button class="btn btn-ghost" id="if-cancel">취소</button>' : "") +
      "</div></div>"
    );
  }

  function itemById(t, id) {
    for (var i = 0; i < t.items.length; i++) if (t.items[i].id === id) return t.items[i];
    return null;
  }

  function wireTopic() {
    var t = findTopic(state.topicId);
    if (!t) return;

    $("#del-topic").onclick = function () {
      if (confirm('"' + t.title + '" 주제를 삭제할까요? 되돌릴 수 없어요.')) {
        topics = topics.filter(function (x) { return x.id !== t.id; });
        persist();
        go("home");
      }
    };
    var mwc = $("#mode-wc"), mdrag = $("#mode-drag");
    if (mwc) mwc.onclick = function () { startWorldcup(t); };
    if (mdrag) mdrag.onclick = function () { go("dragrank"); };

    // 항목 폼
    var fileInput = $("#if-file");
    var dataField = $("#if-data");
    var thumb = $("#if-thumb");
    fileInput.onchange = function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      Store.resizeImage(f).then(function (b64) {
        dataField.value = b64;
        $("#if-url").value = "";
        var img = document.createElement("img");
        img.className = "item-thumb";
        img.id = "if-thumb";
        img.src = b64;
        thumb.replaceWith(img);
        thumb = img;
        toast("이미지를 담았어요");
      }).catch(function (e) { toast(e.message || "이미지 처리 실패"); });
    };

    $("#if-save").onclick = function () {
      var name = $("#if-name").value.trim();
      if (!name) { toast("이름을 입력해 주세요"); $("#if-name").focus(); return; }
      var url = $("#if-url").value.trim();
      var data = dataField.value;
      var image = data || (url || null);

      if (state.editingItemId) {
        var it = itemById(t, state.editingItemId);
        if (it) { it.name = name; it.image = image; }
        toast("수정했어요");
      } else {
        t.items.push({ id: Store.uid(), name: name, image: image });
        toast("추가했어요");
      }
      persist();
      state.editingItemId = null;
      render(); wireTopic();
    };
    var cancel = $("#if-cancel");
    if (cancel) cancel.onclick = function () { state.editingItemId = null; render(); wireTopic(); };

    Array.prototype.forEach.call(app.querySelectorAll("[data-edit]"), function (b) {
      b.onclick = function () {
        state.editingItemId = b.getAttribute("data-edit");
        render(); wireTopic();
        var f = $("#if-name"); if (f) f.focus();
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-del]"), function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-del");
        var it = itemById(t, id);
        if (it && confirm('"' + it.name + '" 항목을 삭제할까요?')) {
          t.items = t.items.filter(function (x) { return x.id !== id; });
          persist();
          render(); wireTopic();
        }
      };
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-result]"), function (b) {
      b.onclick = function () { openSavedResult(t, b.getAttribute("data-result")); };
    });
  }

  // =================== 월드컵 ===================
  function startWorldcup(t) {
    try {
      wc = new Worldcup(t.items, runSeed++);
    } catch (e) { toast(e.message); return; }
    go("worldcup");
  }

  function viewWorldcup() {
    var t = findTopic(state.topicId);
    if (!t || !wc) return '<div class="empty">대결을 준비할 수 없어요.</div>';
    if (wc.isFinished()) { finishWorldcup(t); return '<div class="empty">결과 계산 중…</div>'; }

    var m = wc.currentMatch();
    var pr = wc.progress();
    return (
      '<div class="wc-wrap">' +
      '<div class="wc-progress">' +
      '<div class="wc-round">' + esc(t.title) + " · " + pr.label + "</div>" +
      '<div class="wc-count">' + pr.index + "번째 선택 · 진 항목끼리도 비교해 전체 순위를 정해요</div>" +
      '<div class="wc-bar"><i style="width:' + Math.round(pr.ratio * 100) + '%"></i></div>' +
      "</div>" +
      '<div class="wc-arena">' +
      choiceHTML(m.a, "a") +
      '<div class="wc-vs"><span>VS</span></div>' +
      choiceHTML(m.b, "b") +
      "</div>" +
      '<div class="wc-actions">' +
      '<button class="btn btn-ghost" id="wc-undo"' + (wc.canUndo() ? "" : " disabled") + ">↩ 되돌리기</button>" +
      "</div></div>"
    );
  }
  function choiceHTML(item, side) {
    var photo = item.image
      ? '<span class="photo" style="background-image:url(\'' + esc(item.image) + "')\"></span>"
      : '<span class="photo">🎯</span>';
    return (
      '<button class="wc-choice" data-pick="' + side + '">' +
      photo + '<span class="label">' + esc(item.name) + "</span></button>"
    );
  }
  function wireWorldcup() {
    var t = findTopic(state.topicId);
    Array.prototype.forEach.call(app.querySelectorAll("[data-pick]"), function (b) {
      b.onclick = function () {
        if (!wc || wc.isFinished()) return;
        var side = b.getAttribute("data-pick");
        var buttons = app.querySelectorAll(".wc-choice");
        // 애니메이션 동안 추가 클릭 잠금(중복 선택 방지)
        Array.prototype.forEach.call(buttons, function (x) { x.onclick = null; });
        b.classList.add("chosen");
        Array.prototype.forEach.call(buttons, function (x) { if (x !== b) x.classList.add("faded"); });
        var delay = reducedMotion() ? 60 : 360;
        setTimeout(function () {
          // 애니메이션 대기 중 뒤로가기/종료로 상태가 바뀌었으면 무시
          if (!wc || state.route !== "worldcup") return;
          wc.pick(side);
          if (wc.isFinished()) finishWorldcup(t);
          else { render(); wireWorldcup(); }
        }, delay);
      };
    });
    var undo = $("#wc-undo");
    if (undo) undo.onclick = function () {
      wc.undo();
      render(); wireWorldcup();
    };
  }
  function finishWorldcup(t) {
    var order = wc.ranking();
    pending = {
      title: t.title,
      mode: "worldcup",
      modeLabel: "이상형 월드컵",
      ranking: order.map(function (it) { return { name: it.name, image: it.image }; }),
      saved: false
    };
    wc = null;
    go("result");
    confetti();
  }

  // =================== 드래그 배치 ===================
  function viewDragrank() {
    var t = findTopic(state.topicId);
    if (!t) return '<div class="empty">주제를 찾을 수 없어요.</div>';
    var rows = t.items.map(function (it, i) {
      var thumb = it.image
        ? '<img class="item-thumb" src="' + esc(it.image) + '" alt="">'
        : '<div class="item-thumb placeholder">🎯</div>';
      return (
        '<div class="sortable-item" data-sortable-item data-id="' + it.id + '">' +
        '<span class="rank-badge">' + (i + 1) + "</span>" + thumb +
        '<span class="name">' + esc(it.name) + "</span>" +
        '<span class="grip">≡</span></div>'
      );
    }).join("");
    return (
      "<div>" +
      '<h2 style="font-size:1.3rem;margin:0 0 2px">' + emojiFor(t.title) + " " + esc(t.title) + "</h2>" +
      '<p class="muted mb">끌어서 순서를 바꿔 우선순위를 정하세요.</p>' +
      '<div class="sortable" id="sortable">' + rows + "</div>" +
      '<div class="action-bar">' +
      '<button class="btn btn-ghost" id="dr-cancel">취소</button>' +
      '<button class="btn btn-primary grow" id="dr-done">✓ 순위 확정</button>' +
      "</div></div>"
    );
  }
  function renumber(list) {
    Array.prototype.forEach.call(list.querySelectorAll(".rank-badge"), function (b, i) {
      b.textContent = i + 1;
    });
  }
  function wireDragrank() {
    var t = findTopic(state.topicId);
    var list = $("#sortable");
    sortDestroy = makeSortable(list, {
      itemSelector: "[data-sortable-item]",
      onReorder: function () { renumber(list); }
    });
    $("#dr-cancel").onclick = function () { go("topic"); };
    $("#dr-done").onclick = function () {
      var ids = Array.prototype.map.call(
        list.querySelectorAll("[data-sortable-item]"),
        function (r) { return r.getAttribute("data-id"); }
      );
      var order = ids.map(function (id) { return itemById(t, id); }).filter(Boolean);
      pending = {
        title: t.title,
        mode: "dragrank",
        modeLabel: "드래그 배치",
        ranking: order.map(function (it) { return { name: it.name, image: it.image }; }),
        saved: false
      };
      go("result");
    };
  }

  // =================== 결과 ===================
  function viewResult() {
    if (!pending) return '<div class="empty">결과가 없어요.</div>';
    var rows = pending.ranking.map(function (it, i) {
      var top = i < 3 ? " top" + (i + 1) : "";
      var thumb = it.image
        ? '<img class="item-thumb" src="' + esc(it.image) + '" alt="">'
        : '<div class="item-thumb placeholder">🎯</div>';
      return (
        '<div class="rank-row' + top + '">' +
        '<span class="rank-badge">' + (i + 1) + "</span>" + thumb +
        '<span class="name">' + esc(it.name) + "</span>" +
        (i === 0 ? "<span>👑</span>" : "") + "</div>"
      );
    }).join("");
    var champ = pending.ranking[0];
    return (
      "<div>" +
      '<div class="center" style="margin:8px 0 18px">' +
      '<div style="font-size:2.6rem">🏆</div>' +
      '<h2 style="margin:4px 0 2px">' + (champ ? esc(champ.name) : "") + "</h2>" +
      '<p class="muted">' + esc(pending.title) + " · " + esc(pending.modeLabel) + "</p></div>" +
      '<div class="podium">' + rows + "</div>" +
      '<div class="action-bar" style="flex-wrap:wrap">' +
      '<button class="btn btn-primary grow" id="rs-save"' + (pending.saved ? " disabled" : "") + ">" +
        (pending.saved ? "저장됨 ✓" : "💾 결과 저장") + "</button>" +
      '<button class="btn grow" id="rs-pdf">🖨 PDF 내보내기</button>' +
      '<button class="btn btn-ghost grow" id="rs-again">다시하기</button>' +
      '<button class="btn btn-ghost grow" id="rs-home">홈으로</button>' +
      "</div></div>"
    );
  }
  function wireResult() {
    var t = findTopic(state.topicId);
    $("#rs-save").onclick = function () {
      if (!t || pending.saved) return;
      t.results.unshift({
        id: Store.uid(),
        mode: pending.mode,
        modeLabel: pending.modeLabel,
        dateLabel: dateLabel(),
        ranking: pending.ranking
      });
      pending.saved = true;
      persist();
      toast("컬렉션에 저장했어요 🎉");
      render(); wireResult();
    };
    $("#rs-pdf").onclick = function () {
      PDF.exportRanking(pending.title, pending.ranking, pending.modeLabel);
    };
    $("#rs-again").onclick = function () {
      if (!t) return go("home");
      go("topic");
    };
    $("#rs-home").onclick = function () { go("home"); };
  }

  function openSavedResult(t, resultId) {
    var r = null;
    for (var i = 0; i < t.results.length; i++) if (t.results[i].id === resultId) r = t.results[i];
    if (!r) return;
    pending = {
      title: t.title, mode: r.mode, modeLabel: r.modeLabel,
      ranking: r.ranking, saved: true
    };
    go("result");
  }

  function dateLabel() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
  }

  // =================== 부팅 ===================
  function boot() {
    if (!Store.available()) {
      app.innerHTML = '<div class="empty"><div class="big">😢</div>' +
        "이 브라우저는 저장 기능(localStorage)을 쓸 수 없어요.<br>" +
        "시크릿 모드거나 차단된 상태일 수 있어요.</div>";
      return;
    }
    var loaded = Store.loadAll();
    if (loaded === null) { topics = seed(); persist(); }
    else topics = loaded;
    render();
  }

  boot();
  global.__app = { go: go, state: state }; // 디버그용
})(window);
