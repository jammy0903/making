/* ===== worldcup.js — 이상형 월드컵(전체 순위 매기기) 엔진 ===== */
/* 단일 토너먼트는 1등만 정확하므로, 진 항목끼리도 계속 비교해 1등~꼴등을      */
/* 하나하나 전부 정하는 "비교 기반 병합정렬"로 구현. 매 비교 = 사용자의 한 번 선택. */
/* 이미 정해진 관계는 (이행성으로) 다시 묻지 않아 중복 선택이 없음. undo 지원.   */

(function (global) {
  "use strict";

  // 외부 랜덤 의존 없이 seed 기반으로 초기 순서 섞기(대진이 매번 같지 않게)
  function shuffle(arr, seed) {
    var a = arr.slice();
    var s = seed >>> 0 || 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0; // LCG
      var j = s % (i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 최악의 경우 비교 횟수(병합 트리 구조는 항목 수만 정하므로 선택 결과와 무관).
  // 진행률 바가 뒤로 가지 않도록 상한값으로 사용.
  function worstComparisons(n) {
    var runs = [];
    for (var i = 0; i < n; i++) runs.push(1);
    var total = 0;
    while (runs.length > 1) {
      var next = [];
      for (var k = 0; k < runs.length; k += 2) {
        if (k + 1 < runs.length) { total += runs[k] + runs[k + 1] - 1; next.push(runs[k] + runs[k + 1]); }
        else next.push(runs[k]);
      }
      runs = next;
    }
    return total;
  }

  function Worldcup(items, seed) {
    if (!items || items.length < 2) {
      throw new Error("순위를 정하려면 항목이 2개 이상 필요해요.");
    }
    this._history = [];
    this._comparisons = 0;
    this._done = false;
    this._result = null;

    // 각 항목을 길이 1짜리 정렬된 런(run)으로 시작
    this.queue = shuffle(items, seed).map(function (x) { return [x]; });
    this.nextPass = [];
    this.merge = null;

    this.pass = 1;
    this.totalPasses = Math.max(1, Math.ceil(Math.log2(items.length)));
    this._worst = worstComparisons(items.length);

    this._prepare();
  }

  // this.merge 가 "비교 대기 중"인 상태가 되도록 정리하거나, 끝나면 _done 처리.
  Worldcup.prototype._prepare = function () {
    while (true) {
      if (this.merge) {
        var m = this.merge;
        if (m.i < m.L.length && m.j < m.R.length) return; // 비교할 짝 준비됨
        // 한쪽이 소진 → 남은 쪽을 그대로 이어붙이고 병합 종료
        while (m.i < m.L.length) m.out.push(m.L[m.i++]);
        while (m.j < m.R.length) m.out.push(m.R[m.j++]);
        this.nextPass.push(m.out);
        this.merge = null;
        continue;
      }
      if (this.queue.length >= 2) {
        this.merge = { L: this.queue.shift(), R: this.queue.shift(), out: [], i: 0, j: 0 };
        continue;
      }
      if (this.queue.length === 1) {
        this.nextPass.push(this.queue.shift());
        continue;
      }
      // 이번 패스 끝
      if (this.nextPass.length <= 1) {
        this._result = this.nextPass.length === 1 ? this.nextPass[0] : [];
        this._done = true;
        return;
      }
      this.queue = this.nextPass;
      this.nextPass = [];
      this.pass += 1;
    }
  };

  Worldcup.prototype.isFinished = function () { return this._done; };

  // 현재 비교할 두 항목 { a, b }. a=선호 시 상위. 끝났으면 null.
  Worldcup.prototype.currentMatch = function () {
    if (this._done) return null;
    return { a: this.merge.L[this.merge.i], b: this.merge.R[this.merge.j] };
  };

  Worldcup.prototype.progress = function () {
    return {
      label: this.pass + " / " + this.totalPasses + "단계",
      index: Math.min(this._comparisons + 1, this._worst),
      total: this._worst,
      ratio: this._worst ? Math.min(this._comparisons / this._worst, 1) : 1
    };
  };

  Worldcup.prototype._snapshot = function () {
    var runsCopy = function (list) { return list.map(function (r) { return r.slice(); }); };
    return {
      queue: runsCopy(this.queue),
      nextPass: runsCopy(this.nextPass),
      merge: this.merge
        ? { L: this.merge.L.slice(), R: this.merge.R.slice(), out: this.merge.out.slice(), i: this.merge.i, j: this.merge.j }
        : null,
      pass: this.pass,
      comparisons: this._comparisons,
      done: this._done,
      result: this._result
    };
  };

  // 선택: which === "a"(L[i] 선호) | "b"(R[j] 선호)
  Worldcup.prototype.pick = function (which) {
    if (this._done) return;
    this._history.push(this._snapshot());
    var m = this.merge;
    if (which === "a") { m.out.push(m.L[m.i]); m.i++; }
    else { m.out.push(m.R[m.j]); m.j++; }
    this._comparisons++;
    this._prepare();
  };

  Worldcup.prototype.canUndo = function () { return this._history.length > 0; };

  Worldcup.prototype.undo = function () {
    if (!this._history.length) return;
    var s = this._history.pop();
    this.queue = s.queue;
    this.nextPass = s.nextPass;
    this.merge = s.merge;
    this.pass = s.pass;
    this._comparisons = s.comparisons;
    this._done = s.done;
    this._result = s.result;
  };

  // 최종 순위(항목 배열, 1위부터). 모든 항목이 서로의 비교로 정해진 완전한 순위.
  Worldcup.prototype.ranking = function () {
    return this._done ? this._result.slice() : null;
  };

  global.Worldcup = Worldcup;
})(window);
