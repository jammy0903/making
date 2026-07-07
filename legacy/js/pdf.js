/* ===== pdf.js — 결과를 print CSS 방식으로 내보내기 ===== */
/* 브라우저 기본 렌더링을 쓰므로 한글 폰트 깨짐 없음. window.print()로 PDF 저장 유도. */

(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function todayStr() {
    // Date 사용 가능(브라우저 런타임). YYYY. MM. DD.
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + ". " + pad(d.getMonth() + 1) + ". " + pad(d.getDate()) + ".";
  }

  // title: 주제명, items: 순위대로 정렬된 [{name, image}], modeLabel: 문자열
  function exportRanking(title, items, modeLabel) {
    var area = document.getElementById("print-area");
    if (!area) return;

    var rows = items.map(function (it, i) {
      var thumb = it.image
        ? '<img class="p-thumb" src="' + esc(it.image) + '" alt="">'
        : '<div class="p-thumb" style="background:#eee;display:flex;align-items:center;justify-content:center">🎯</div>';
      return (
        '<div class="p-row">' +
        '<div class="p-num">' + (i + 1) + "</div>" +
        thumb +
        '<div class="p-name">' + esc(it.name) + "</div>" +
        "</div>"
      );
    }).join("");

    area.innerHTML =
      '<div class="sheet">' +
      "<h1>" + esc(title) + "</h1>" +
      '<div class="date">' + esc(modeLabel || "") + " · " + todayStr() + "</div>" +
      rows +
      '<div class="sign">정하기 놀이터에서 만든 순위표 · 서명: ______________</div>' +
      "</div>";

    // 인쇄 대화상자 열기(사용자가 "PDF로 저장" 선택)
    global.print();
  }

  global.PDF = { exportRanking: exportRanking };
})(window);
