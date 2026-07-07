/**
 * 세로 리스트 드래그 정렬 Svelte 액션 (Pointer Events, 터치/마우스 공통).
 * legacy/js/sortable.js 를 이식. 드래그 중 DOM 을 재배치하고, 놓을 때
 * 최종 순서(data-id 배열)를 onReorder 로 알린다.
 *
 * 사용: <ul use:dragReorder={{ onReorder }}> 각 항목에 data-drag-item data-id="..."
 */
export interface DragReorderParams {
	onReorder: (orderedIds: string[]) => void;
}

const ITEM_SELECTOR = '[data-drag-item]';

export function dragReorder(list: HTMLElement, params: DragReorderParams) {
	let onReorder = params.onReorder;
	let dragging: HTMLElement | null = null;
	let grabOffset = 0;
	let pointerId: number | null = null;

	const items = () => Array.from(list.querySelectorAll<HTMLElement>(ITEM_SELECTOR));

	function onDown(e: PointerEvent) {
		const row = (e.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR);
		if (!row || !list.contains(row)) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return; // 좌클릭만
		dragging = row;
		pointerId = e.pointerId;
		grabOffset = e.clientY - row.getBoundingClientRect().top;
		row.classList.add('dragging');
		row.setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onMove(e: PointerEvent) {
		if (!dragging || e.pointerId !== pointerId) return;
		e.preventDefault();
		// 손가락 밑에 오도록 translate 재계산
		dragging.style.transform = '';
		const naturalTop = dragging.getBoundingClientRect().top;
		dragging.style.transform = `translateY(${e.clientY - grabOffset - naturalTop}px)`;

		// 포인터 위치로 삽입 지점 결정
		const y = e.clientY;
		let before: HTMLElement | null = null;
		for (const r of items()) {
			if (r === dragging) continue;
			const rect = r.getBoundingClientRect();
			if (y < rect.top + rect.height / 2) {
				before = r;
				break;
			}
		}
		if (before) {
			if (dragging.nextSibling !== before) list.insertBefore(dragging, before);
		} else if (list.lastElementChild !== dragging) {
			list.appendChild(dragging);
		}
	}

	function onUp(e: PointerEvent) {
		if (!dragging || e.pointerId !== pointerId) return;
		dragging.style.transform = '';
		dragging.classList.remove('dragging');
		try {
			dragging.releasePointerCapture(e.pointerId);
		} catch {
			/* 이미 해제됨 */
		}
		dragging = null;
		pointerId = null;
		const ids = items()
			.map((r) => r.dataset.id)
			.filter((id): id is string => !!id);
		onReorder(ids);
	}

	list.addEventListener('pointerdown', onDown);
	list.addEventListener('pointermove', onMove);
	list.addEventListener('pointerup', onUp);
	list.addEventListener('pointercancel', onUp);

	return {
		update(p: DragReorderParams) {
			onReorder = p.onReorder;
		},
		destroy() {
			list.removeEventListener('pointerdown', onDown);
			list.removeEventListener('pointermove', onMove);
			list.removeEventListener('pointerup', onUp);
			list.removeEventListener('pointercancel', onUp);
		}
	};
}
