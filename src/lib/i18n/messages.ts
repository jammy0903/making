import type { Locale } from './index';

/** UI 문구 사전. 키는 화면/영역별 그룹. {var} 는 실행 시 치환. */
export const messages = {
	ko: {
		'app.title': '순위 월드컵',
		'nav.home': '홈으로',
		'lang.label': '언어',

		'home.intro': '후보를 비교하거나 직접 배치해 <b>전체 순위</b>를 정하는 놀이터.',
		'home.newTopic': '+ 새 주제 만들기',
		'home.empty': '아직 만든 주제가 없어요.<br />위 버튼으로 첫 주제를 만들어 보세요.',
		'home.play': '▶ 플레이',
		'home.notEnough': '후보 부족',
		'home.seo.title': '순위 월드컵 - 이상형 월드컵 만들기·음식·동물·연예인 순위',
		'home.seo.description':
			'이상형 월드컵처럼 둘 중 하나를 골라 전체 순위를 정하는 놀이터. 음식·새끼동물·아이돌 등 다양한 월드컵을 즐기고 나만의 월드컵도 만들어요.',

		'mode.worldcup': '순위 월드컵',
		'mode.drag': '직접 순위',
		'badge.count': '{n}명',
		'common.delete': '삭제',

		'create.heading': '새 주제 만들기',
		'create.fieldTitle': '제목',
		'create.titlePlaceholder': '예: 최애 간식 순위',
		'create.fieldDesc': '설명 (선택)',
		'create.descPlaceholder': '한 줄 소개',
		'create.fieldMode': '기본 방식',
		'create.modeOptWorldcup': '순위 월드컵 (둘 중 하나 고르기)',
		'create.modeOptDrag': '직접 순위 (드래그로 배치)',
		'create.candidates': '후보',
		'create.filled': '({n}명)',
		'create.max': '최대 {n}명',
		'create.candidateName': '후보 {i} 이름',
		'create.addPhoto': '사진 추가',
		'create.searchPhoto': '사진 검색',
		'create.addCandidate': '+ 후보 추가',
		'create.errTitle': '주제 제목을 입력해 주세요.',
		'create.errCandidates': '후보를 이름과 함께 2명 이상 추가해 주세요.',
		'create.errImage': '이미지를 처리하지 못했어요. 다른 파일을 시도해 주세요.',
		'create.save': '주제 저장하고 플레이',

		'topic.loading': '불러오는 중…',
		'topic.notFound': '주제를 찾을 수 없어요.',
		'topic.candidateCount': '후보 {n}명',
		'topic.howDecide': '어떻게 정할까요?',
		'topic.optWorldcup': '⚔️ 순위 월드컵 — 둘 중 하나씩 골라 전체 순위',
		'topic.optDrag': '✋ 직접 순위 — 드래그로 직접 배치',
		'topic.needTwo': '후보가 2명 이상이어야 플레이할 수 있어요.',

		'result.suffix': '결과',
		'result.done': '순위가 정해졌어요!',
		'result.exportPdf': '📄 PDF로 내보내기',
		'result.restart': '다시 하기',
		'result.hesitation.title': '⏱ 고뇌 리포트',
		'result.hesitation.agonized': '가장 고뇌한 대결: {a} vs {b} · {s}초',
		'result.hesitation.instant': '0초컷: {a} (vs {b}) · {s}초, 한 치의 망설임도 없음',

		'play.progress': '{asked} / 약 {est}회',
		'play.undo': '↶ 되돌리기',
		'play.timeLimit': '⏱ 각 대결은 2분 안에 골라주세요.',
		'play.away.title': '자리 비우셨나요? 타이머를 멈춰뒀어요.',
		'play.away.resume': '계속하기',
		'play.pickHigher': '둘 중 더 위인 걸 골라요',

		'rank.instruction': '아래 후보를 위 순위 칸으로 <b>끌어다 놓아</b> 정해요 (좌상단이 1등)',
		'rank.allPlaced': '모든 후보를 배치했어요 🎉',
		'rank.done': '이 순위로 완료',
		'rank.remaining': '아직 {n}칸 남았어요',

		'search.title': '이미지 검색',
		'search.placeholder': '검색어 (예: 골든리트리버)',
		'search.searching': '검색 중',
		'search.search': '검색',
		'search.close': '닫기',
		'search.loading': '불러오는 중…',
		'search.noResults': '검색 결과가 없어요. 다른 검색어를 시도해 보세요.',
		'search.failed': '검색에 실패했어요.',
		'search.pickFailed': '이 이미지는 가져오지 못했어요. 다른 걸 골라 주세요.',
		'search.hint': '이미지를 클릭하면 이 후보 사진으로 설정돼요. (웹 이미지는 저작권 주의)',

		'ad.dogWalk': '강아지 산책 — 타자로 걷는 크롬 확장'
	},

	en: {
		'app.title': 'Ranking Worldcup',
		'nav.home': 'Home',
		'lang.label': 'Language',

		'home.intro': 'A playground to decide a <b>full ranking</b> by comparing or arranging candidates.',
		'home.newTopic': '+ New topic',
		'home.empty': "You haven't made any topics yet.<br />Use the button above to create your first one.",
		'home.play': '▶ Play',
		'home.notEnough': 'Need more',
		'home.seo.title': 'Ranking Worldcup - Make Your Own Ideal Type Tournament',
		'home.seo.description':
			'Pick one of two to rank everything, ideal-type worldcup style. Play food, baby animal, idol tournaments and create your own.',

		'mode.worldcup': 'Ranking Worldcup',
		'mode.drag': 'Manual ranking',
		'badge.count': '{n}',
		'common.delete': 'Delete',

		'create.heading': 'New topic',
		'create.fieldTitle': 'Title',
		'create.titlePlaceholder': 'e.g. Favorite snacks ranking',
		'create.fieldDesc': 'Description (optional)',
		'create.descPlaceholder': 'One-line intro',
		'create.fieldMode': 'Default mode',
		'create.modeOptWorldcup': 'Ranking Worldcup (pick one of two)',
		'create.modeOptDrag': 'Manual ranking (drag to arrange)',
		'create.candidates': 'Candidates',
		'create.filled': '({n})',
		'create.max': 'Max {n}',
		'create.candidateName': 'Candidate {i} name',
		'create.addPhoto': 'Add photo',
		'create.searchPhoto': 'Search photo',
		'create.addCandidate': '+ Add candidate',
		'create.errTitle': 'Please enter a topic title.',
		'create.errCandidates': 'Add at least 2 candidates with names.',
		'create.errImage': "Couldn't process the image. Try another file.",
		'create.save': 'Save & play',

		'topic.loading': 'Loading…',
		'topic.notFound': "Topic not found.",
		'topic.candidateCount': '{n} candidates',
		'topic.howDecide': 'How to decide?',
		'topic.optWorldcup': '⚔️ Ranking Worldcup — pick one of two for a full ranking',
		'topic.optDrag': '✋ Manual ranking — arrange by dragging',
		'topic.needTwo': 'You need at least 2 candidates to play.',

		'result.suffix': 'Results',
		'result.done': 'The ranking is decided!',
		'result.exportPdf': '📄 Export as PDF',
		'result.restart': 'Play again',
		'result.hesitation.title': '⏱ Agony report',
		'result.hesitation.agonized': 'Most agonizing duel: {a} vs {b} · {s}s',
		'result.hesitation.instant': 'Instant call: {a} (vs {b}) · {s}s, no hesitation at all',

		'play.progress': '{asked} / ~{est}',
		'play.undo': '↶ Undo',
		'play.timeLimit': '⏱ Pick within 2 minutes for each duel.',
		'play.away.title': 'Stepped away? We paused the timer.',
		'play.away.resume': 'Resume',
		'play.pickHigher': 'Pick the one you rank higher',

		'rank.instruction': '<b>Drag</b> candidates below into the rank slots above (top-left is #1)',
		'rank.allPlaced': 'All candidates placed 🎉',
		'rank.done': 'Done with this ranking',
		'rank.remaining': '{n} slots left',

		'search.title': 'Image search',
		'search.placeholder': 'Search (e.g. golden retriever)',
		'search.searching': 'Searching',
		'search.search': 'Search',
		'search.close': 'Close',
		'search.loading': 'Loading…',
		'search.noResults': 'No results. Try a different search term.',
		'search.failed': 'Search failed.',
		'search.pickFailed': "Couldn't fetch this image. Pick another one.",
		'search.hint': 'Click an image to set it as this candidate. (Mind web image copyrights)',

		'ad.dogWalk': 'Dog Walk — a Chrome extension you walk by typing'
	},

	zh: {
		'app.title': '排名世界杯',
		'nav.home': '首页',
		'lang.label': '语言',

		'home.intro': '通过对比或手动排列候选，来决定<b>完整排名</b>的小游戏。',
		'home.newTopic': '+ 新建主题',
		'home.empty': '还没有创建任何主题。<br />用上方按钮创建第一个吧。',
		'home.play': '▶ 开始',
		'home.notEnough': '候选不足',
		'home.seo.title': '排名世界杯 - 制作理想型世界杯·美食·动物·明星排名',
		'home.seo.description':
			'像理想型世界杯一样二选一，决出完整排名。畅玩美食、萌宠、偶像等世界杯，也能创建自己的世界杯。',

		'mode.worldcup': '排名世界杯',
		'mode.drag': '手动排名',
		'badge.count': '{n}名',
		'common.delete': '删除',

		'create.heading': '新建主题',
		'create.fieldTitle': '标题',
		'create.titlePlaceholder': '例如：最爱零食排名',
		'create.fieldDesc': '描述（可选）',
		'create.descPlaceholder': '一句话介绍',
		'create.fieldMode': '默认方式',
		'create.modeOptWorldcup': '排名世界杯（二选一）',
		'create.modeOptDrag': '手动排名（拖拽排列）',
		'create.candidates': '候选',
		'create.filled': '（{n}名）',
		'create.max': '最多 {n} 名',
		'create.candidateName': '候选 {i} 名称',
		'create.addPhoto': '添加照片',
		'create.searchPhoto': '搜索照片',
		'create.addCandidate': '+ 添加候选',
		'create.errTitle': '请输入主题标题。',
		'create.errCandidates': '请至少添加 2 个带名称的候选。',
		'create.errImage': '无法处理该图片，请换一个文件。',
		'create.save': '保存并开始',

		'topic.loading': '加载中…',
		'topic.notFound': '找不到该主题。',
		'topic.candidateCount': '候选 {n} 名',
		'topic.howDecide': '如何决定？',
		'topic.optWorldcup': '⚔️ 排名世界杯 — 二选一决出完整排名',
		'topic.optDrag': '✋ 手动排名 — 拖拽排列',
		'topic.needTwo': '至少需要 2 个候选才能开始。',

		'result.suffix': '结果',
		'result.done': '排名已定！',
		'result.exportPdf': '📄 导出为 PDF',
		'result.restart': '再玩一次',
		'result.hesitation.title': '⏱ 纠结报告',
		'result.hesitation.agonized': '最纠结的对决：{a} vs {b} · {s}秒',
		'result.hesitation.instant': '秒选：{a}（vs {b}）· {s}秒，毫不犹豫',

		'play.progress': '{asked} / 约 {est} 次',
		'play.undo': '↶ 撤销',
		'play.timeLimit': '⏱ 每场对决请在 2 分钟内选择。',
		'play.away.title': '离开了吗？计时器已暂停。',
		'play.away.resume': '继续',
		'play.pickHigher': '选出你觉得更靠前的一个',

		'rank.instruction': '把下方候选<b>拖入</b>上方排名格来决定（左上为第 1 名）',
		'rank.allPlaced': '所有候选已放置 🎉',
		'rank.done': '完成此排名',
		'rank.remaining': '还剩 {n} 格',

		'search.title': '图片搜索',
		'search.placeholder': '搜索词（例如：金毛）',
		'search.searching': '搜索中',
		'search.search': '搜索',
		'search.close': '关闭',
		'search.loading': '加载中…',
		'search.noResults': '没有结果，换个搜索词试试。',
		'search.failed': '搜索失败。',
		'search.pickFailed': '无法获取该图片，请换一张。',
		'search.hint': '点击图片即可设为该候选的照片。（注意网络图片版权）',

		'ad.dogWalk': '遛狗 — 用打字前进的 Chrome 扩展'
	}
} satisfies Record<Locale, Record<string, string>>;

/** 모든 로케일이 가져야 할 번역 키(ko 를 원천으로). 호출부 `t('key')` 오타를 컴파일 타임에 차단. */
export type MessageKey = keyof (typeof messages)['ko'];

// en·zh 가 ko 와 같은 키 집합인지 컴파일 타임 검증: 누락 키가 있으면 아래 대입에서 타입 에러가 난다.
type _MissingKeys =
	| Exclude<MessageKey, keyof (typeof messages)['en']>
	| Exclude<MessageKey, keyof (typeof messages)['zh']>;
const _assertNoMissingKeys: [_MissingKeys] extends [never] ? true : _MissingKeys = true;
void _assertNoMissingKeys;
