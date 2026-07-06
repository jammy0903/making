/* ===== storage.js — localStorage 기반 데이터 계층 ===== */
/* 주제/항목/결과 CRUD + 이미지 리사이즈. 실패는 조용히 삼키지 않고 예외로 드러냄. */

(function (global) {
  "use strict";

  var KEY = "jeonghagi.topics.v1";
  var MAX_IMG = 480; // 리사이즈 최대 변(px) — localStorage 용량 고려

  // localStorage 미지원/차단 여부 확인
  function available() {
    try {
      var t = "__t__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    // 시간 대신 성능 카운터 기반(외부 랜덤 의존 최소화) — 충돌 방지용 접미사 포함
    uid._n = (uid._n || 0) + 1;
    return "id" + Math.floor(performance.now() * 1000).toString(36) + "_" + uid._n;
  }

  function loadAll() {
    if (!available()) return [];
    var raw = localStorage.getItem(KEY);
    if (!raw) return null; // null = 최초 진입(예시 시드 필요)
    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("[storage] 파싱 실패, 초기화합니다", e);
      return [];
    }
  }

  function saveAll(topics) {
    if (!available()) {
      throw new Error("이 브라우저에서는 저장(localStorage)을 쓸 수 없어요.");
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(topics));
    } catch (e) {
      // 용량 초과(QuotaExceeded) 등
      throw new Error("저장 공간이 부족해요. 이미지를 줄이거나 주제를 정리해 주세요.");
    }
  }

  // ---- 이미지 파일 → 리사이즈된 base64(JPEG) ----
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("이미지 파일이 아니에요."));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("파일을 읽지 못했어요.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("이미지를 여는 데 실패했어요.")); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, MAX_IMG / Math.max(w, h));
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, cw, ch);
          try {
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } catch (e) {
            reject(new Error("이미지 변환에 실패했어요."));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  var Store = {
    available: available,
    uid: uid,
    loadAll: loadAll,
    saveAll: saveAll,
    resizeImage: resizeImage
  };

  global.Store = Store;
})(window);
