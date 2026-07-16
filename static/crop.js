// 고정비율 이미지 크로퍼 (프레임워크 독립). window.cropImageToRatio(file, aspect) → Promise<Blob|null>.
// 파일을 고정비율 프레임 안에서 드래그(이동)+확대해 보이는 영역만 잘라 webp Blob으로 반환.
// 취소하면 null. 신청 페이지(Svelte)·관리자(vanilla) 공용 — app.html·manage-8949에서 로드.
(function () {
  const MAX_OUT_W = 1200; // 출력 가로 상한(업스케일 방지)

  window.cropImageToRatio = function (file, aspect) {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image')) { resolve(null); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.onload = () => {
        const Nw = img.naturalWidth, Nh = img.naturalHeight;
        // ── 프레임(표시) 크기: 화면에 맞춰 aspect 유지 ──
        const fw = Math.min(window.innerWidth * 0.9, 460);
        const Fw = Math.round(fw), Fh = Math.round(fw / aspect);
        const baseScale = Math.max(Fw / Nw, Fh / Nh); // zoom=1이 프레임을 딱 덮음
        let zoom = 1;
        let dispW = Nw * baseScale * zoom, dispH = Nh * baseScale * zoom;
        let tx = (Fw - dispW) / 2, ty = (Fh - dispH) / 2; // 중앙 정렬 시작

        const clamp = () => {
          tx = Math.min(0, Math.max(Fw - dispW, tx));
          ty = Math.min(0, Math.max(Fh - dispH, ty));
        };
        clamp();

        // ── DOM ──
        const ov = document.createElement('div');
        ov.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;box-sizing:border-box');
        const frame = document.createElement('div');
        frame.setAttribute('style', `position:relative;width:${Fw}px;height:${Fh}px;overflow:hidden;border-radius:8px;background:#000;touch-action:none;cursor:grab;box-shadow:0 0 0 2px #fff,0 0 0 9999px rgba(0,0,0,.4)`);
        const im = document.createElement('img');
        im.src = url;
        im.draggable = false;
        im.setAttribute('style', 'position:absolute;left:0;top:0;user-select:none;-webkit-user-drag:none;will-change:transform');
        frame.appendChild(im);

        const apply = () => { im.style.width = dispW + 'px'; im.style.height = dispH + 'px'; im.style.transform = `translate(${tx}px,${ty}px)`; };
        apply();

        // 줌 슬라이더
        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = '1'; slider.max = '4'; slider.step = '0.01'; slider.value = '1';
        slider.setAttribute('style', `width:${Fw}px;max-width:90vw`);
        const setZoom = (z, cx, cy) => {
          const prev = zoom;
          zoom = Math.min(4, Math.max(1, z));
          const px = cx == null ? Fw / 2 : cx, py = cy == null ? Fh / 2 : cy;
          // 확대 기준점(px,py) 고정
          const k = zoom / prev;
          tx = px - (px - tx) * k; ty = py - (py - ty) * k;
          dispW = Nw * baseScale * zoom; dispH = Nh * baseScale * zoom;
          clamp(); apply(); slider.value = String(zoom);
        };
        slider.oninput = () => setZoom(parseFloat(slider.value));

        // 드래그(이동)
        let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;
        frame.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty; frame.style.cursor = 'grabbing'; frame.setPointerCapture(e.pointerId); });
        frame.addEventListener('pointermove', (e) => { if (!dragging) return; tx = stx + (e.clientX - sx); ty = sty + (e.clientY - sy); clamp(); apply(); });
        const endDrag = () => { dragging = false; frame.style.cursor = 'grab'; };
        frame.addEventListener('pointerup', endDrag);
        frame.addEventListener('pointercancel', endDrag);
        // 휠 줌
        frame.addEventListener('wheel', (e) => { e.preventDefault(); const r = frame.getBoundingClientRect(); setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });

        // 버튼
        const btns = document.createElement('div');
        btns.setAttribute('style', 'display:flex;gap:10px');
        const mk = (label, bg, fg) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('style', `padding:10px 20px;border:none;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer;background:${bg};color:${fg}`); return b; };
        const en = document.documentElement.lang === 'en';
        const cancelBtn = mk(en ? 'Cancel' : '취소', '#444', '#fff');
        const okBtn = mk(en ? 'Apply' : '적용', '#1E7A4E', '#fff');
        const hint = document.createElement('div');
        hint.textContent = en ? 'Drag to move · scroll or slider to zoom' : '드래그로 이동 · 휠/슬라이더로 확대';
        hint.setAttribute('style', 'color:#ccc;font-size:13px');

        const cleanup = () => { URL.revokeObjectURL(url); ov.remove(); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        okBtn.onclick = () => {
          // 보이는 영역(프레임)을 원본 좌표로 환산해 크롭
          const s = baseScale * zoom;
          const cropSx = -tx / s, cropSy = -ty / s, cropSw = Fw / s, cropSh = Fh / s;
          const outW = Math.min(MAX_OUT_W, Math.round(cropSw));
          const outH = Math.round(outW / aspect);
          const cv = document.createElement('canvas');
          cv.width = outW; cv.height = outH;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, cropSx, cropSy, cropSw, cropSh, 0, 0, outW, outH);
          cv.toBlob((blob) => { cleanup(); resolve(blob); }, 'image/webp', 0.9);
        };

        btns.appendChild(cancelBtn); btns.appendChild(okBtn);
        ov.appendChild(frame); ov.appendChild(slider); ov.appendChild(hint); ov.appendChild(btns);
        document.body.appendChild(ov);
      };
      img.src = url;
    });
  };
})();
