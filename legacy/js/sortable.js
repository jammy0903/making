/* ===== sortable.js — 세로 리스트 드래그 정렬(터치/마우스 공통) ===== */
/* Pointer Events 기반. 손가락을 따라 이동하며 중점 교차 시 DOM 재배치. */

(function (global) {
  "use strict";

  // list: 컨테이너, opts.itemSelector: 드래그 항목 선택자, opts.onReorder(orderEls)
  function makeSortable(list, opts) {
    opts = opts || {};
    var sel = opts.itemSelector || "[data-sortable-item]";
    var onReorder = opts.onReorder || function () {};

    var dragging = null;
    var grabOffset = 0;
    var pointerId = null;

    function items() {
      return Array.prototype.slice.call(list.querySelectorAll(sel));
    }

    function onDown(e) {
      var row = e.target.closest(sel);
      if (!row || !list.contains(row)) return;
      // 마우스는 좌클릭만
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragging = row;
      pointerId = e.pointerId;
      var rect = row.getBoundingClientRect();
      grabOffset = e.clientY - rect.top;
      row.classList.add("dragging");
      row.setPointerCapture(pointerId);
      list.style.cursor = "grabbing";
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      e.preventDefault();

      // transform 제거 후 실제 자연 위치 측정 → 손가락 밑에 오도록 재계산
      dragging.style.transform = "";
      var naturalTop = dragging.getBoundingClientRect().top;
      var desiredTop = e.clientY - grabOffset;
      dragging.style.transform = "translateY(" + (desiredTop - naturalTop) + "px)";

      // 포인터 위치 기준으로 삽입 지점 결정
      var y = e.clientY;
      var others = items().filter(function (r) { return r !== dragging; });
      var before = null;
      for (var i = 0; i < others.length; i++) {
        var r = others[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) { before = others[i]; break; }
      }
      if (before) {
        if (dragging.nextSibling !== before) list.insertBefore(dragging, before);
      } else {
        if (list.lastElementChild !== dragging) list.appendChild(dragging);
      }
    }

    function onUp(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging.style.transform = "";
      dragging.classList.remove("dragging");
      try { dragging.releasePointerCapture(pointerId); } catch (_) {}
      list.style.cursor = "";
      dragging = null;
      pointerId = null;
      onReorder(items());
    }

    list.addEventListener("pointerdown", onDown);
    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerup", onUp);
    list.addEventListener("pointercancel", onUp);

    // 정리 함수 반환(뷰 전환 시 호출)
    return function destroy() {
      list.removeEventListener("pointerdown", onDown);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerup", onUp);
      list.removeEventListener("pointercancel", onUp);
    };
  }

  global.makeSortable = makeSortable;
})(window);
