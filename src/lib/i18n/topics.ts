import type { Locale } from './index';

/**
 * 샘플 주제의 언어별 제목·설명(및 일부 에버그린 후보 이름).
 * ko 는 samples.ts 원본을 쓰고, en/zh 는 여기서 덮어쓴다.
 * 브랜드·인물·한국 고유 음식 등은 후보 번역을 생략(원어 유지)한다.
 */
export interface TopicTr {
	title: string;
	description: string;
	candidates?: string[]; // 후보 이름(번역). 순서는 samples 와 동일. 없으면 원어.
}

export const topicTranslations: Record<string, Partial<Record<Locale, TopicTr>>> = {
	'girl-idol': {
		en: { title: '💃 Girl Idol Ideal Type Worldcup', description: 'Trending K-pop girl groups' },
		zh: { title: '💃 女团理想型世界杯', description: '当红女团（PIKU 热门）' }
	},
	'boy-idol': {
		en: { title: '🕺 Boy Idol Ideal Type Worldcup', description: 'Trending K-pop boy idols' },
		zh: { title: '🕺 男团理想型世界杯', description: '当红男偶像' }
	},
	actress: {
		en: { title: '🎬 Actress Ideal Type Worldcup', description: 'Beautiful actresses' },
		zh: { title: '🎬 女演员理想型世界杯', description: '漂亮的女演员' }
	},
	actor: {
		en: { title: '🎥 Actor Ideal Type Worldcup', description: 'Handsome actors' },
		zh: { title: '🎥 男演员理想型世界杯', description: '帅气的男演员' }
	},
	'anime-girl': {
		en: { title: '🌸 Anime Girl Character Worldcup', description: 'Pick your favorite anime girl' },
		zh: { title: '🌸 动漫女角色世界杯', description: '选出最爱的动漫女角' }
	},
	'anime-boy': {
		en: {
			title: '⚔️ Anime & Game Boy Character Worldcup',
			description: 'Cute and cool male characters'
		},
		zh: { title: '⚔️ 动漫·游戏男角色世界杯', description: '又帅又可爱的男角' }
	},
	'best-food': {
		en: { title: '🍔 Best Food Worldcup', description: "What's your favorite food?" },
		zh: { title: '🍔 最爱美食世界杯', description: '你最爱的食物是？' }
	},
	ramen: {
		en: { title: '🍜 Best Ramen Worldcup', description: 'Find the ultimate instant noodle' },
		zh: { title: '🍜 最强泡面世界杯', description: '选出最好吃的泡面' }
	},
	'convenience-store-food': {
		en: { title: '🏪 Convenience Store Food Worldcup', description: 'Grab-and-go favorites' },
		zh: { title: '🏪 便利店美食世界杯', description: '便利店里最想拿的' }
	},
	bunsik: {
		en: { title: '🍢 Korean Street Snack Worldcup', description: 'Favorite bunsik menu' },
		zh: { title: '🍢 韩式小吃世界杯', description: '最爱的小吃店菜单' }
	},
	'delivery-food': {
		en: { title: '🛵 Delivery Food Worldcup', description: 'What should we order today?' },
		zh: { title: '🛵 外卖美食世界杯', description: '今天点什么吃？' }
	},
	'korean-stew': {
		en: { title: '🍲 Korean Stew & Soup Worldcup', description: 'The king of hot soups' },
		zh: { title: '🍲 韩式汤锅世界杯', description: '热汤中的王者' }
	},
	gukbap: {
		en: { title: '🍚 Gukbap Rice Soup Worldcup', description: 'Hangover cure: gukbap' },
		zh: { title: '🍚 汤饭世界杯', description: '解酒还得靠汤饭' }
	},
	'world-food': {
		en: {
			title: '🌍 World Food Worldcup',
			description: 'Your favorite cuisine worldwide?',
			candidates: [
				'Pizza',
				'Sushi',
				'Pasta',
				'Taco',
				'Pho',
				'Pad Thai',
				'Steak',
				'Dim Sum',
				'Kebab',
				'Curry',
				'Burger',
				'Hot Pot'
			]
		},
		zh: {
			title: '🌍 世界美食世界杯',
			description: '全球料理最爱哪个？',
			candidates: [
				'披萨',
				'寿司',
				'意面',
				'塔可',
				'越南河粉',
				'泰式炒河粉',
				'牛排',
				'点心',
				'烤肉串',
				'咖喱',
				'汉堡',
				'火锅'
			]
		}
	},
	'chicken-brand': {
		en: { title: '🐔 Chicken Brand Worldcup', description: 'Favorite chicken brand' },
		zh: { title: '🐔 炸鸡品牌世界杯', description: '最爱的炸鸡品牌' }
	},
	'pie-snack': {
		en: { title: '🥧 Pie Snack Worldcup', description: 'The best soft pie snack' },
		zh: { title: '🥧 派点心世界杯', description: '最强松软派点心' }
	},
	'bag-snack': {
		en: { title: '🍿 Bag Snack Worldcup', description: 'Bagged snacks that vanish fast' },
		zh: { title: '🍿 袋装零食世界杯', description: '一开袋就秒光的袋装零食' }
	},
	'potato-snack': {
		en: { title: '🥔 Potato Snack Worldcup', description: 'The best potato chip snack' },
		zh: { title: '🥔 薯片世界杯', description: '最强薯片系零食' }
	},
	'sweet-snack': {
		en: { title: '🍫 Sweet Snack Worldcup', description: 'The best sweet snack' },
		zh: { title: '🍫 甜味零食世界杯', description: '最强甜味零食' }
	},
	'salty-snack': {
		en: { title: '🧂 Salty Snack Worldcup', description: 'The best salty snack' },
		zh: { title: '🧂 咸味零食世界杯', description: '最强咸味零食' }
	},
	'ice-cream': {
		en: { title: '🍦 Ice Cream Worldcup', description: 'The one you crave in summer' },
		zh: { title: '🍦 冰淇淋世界杯', description: '夏天最想吃的那个' }
	},
	dessert: {
		en: { title: '🍩 Dessert Worldcup', description: 'The sweetest champion' },
		zh: { title: '🍩 甜点世界杯', description: '最甜蜜的冠军' }
	},
	bread: {
		en: { title: '🥐 Bread Worldcup', description: 'What you grab at the bakery' },
		zh: { title: '🥐 面包世界杯', description: '面包店必买的那款' }
	},
	'street-food': {
		en: { title: '🍡 Street Snack Worldcup', description: 'That taste by the school gate' },
		zh: { title: '🍡 街头小吃世界杯', description: '校门口的那个味' }
	},
	'rice-cake': {
		en: { title: '🍘 Rice Cake Tteok Worldcup', description: 'The chewiest champion' },
		zh: { title: '🍘 年糕世界杯', description: '最有嚼劲的冠军' }
	},
	'cafe-drink': {
		en: { title: '☕ Cafe Drink Worldcup', description: 'Your go-to cafe order' },
		zh: { title: '☕ 咖啡厅饮品世界杯', description: '去咖啡厅必点的' }
	},
	soda: {
		en: { title: '🥤 Soda Worldcup', description: 'The fizzy favorite' },
		zh: { title: '🥤 碳酸饮料世界杯', description: '最爱的气泡饮' }
	},
	alcohol: {
		en: { title: '🍺 Drinks Worldcup', description: 'What are we drinking tonight?' },
		zh: { title: '🍺 酒类世界杯', description: '今晚喝什么？' }
	},
	fruit: {
		en: {
			title: '🍓 Fruit Worldcup',
			description: 'Your favorite fruit',
			candidates: [
				'Strawberry',
				'Watermelon',
				'Grapes',
				'Peach',
				'Mango',
				'Shine Muscat',
				'Tangerine',
				'Apple',
				'Banana',
				'Korean Melon',
				'Cherry',
				'Pineapple'
			]
		},
		zh: {
			title: '🍓 水果世界杯',
			description: '你最喜欢的水果',
			candidates: [
				'草莓',
				'西瓜',
				'葡萄',
				'桃子',
				'芒果',
				'阳光玫瑰',
				'橘子',
				'苹果',
				'香蕉',
				'香瓜',
				'樱桃',
				'菠萝'
			]
		}
	},
	'baby-animal': {
		en: {
			title: '🐣 Baby Animal Worldcup',
			description: 'Pick the cutest baby animal',
			candidates: [
				'Puppy',
				'Kitten',
				'Hamster',
				'Bunny',
				'Chick',
				'Baby Penguin',
				'Baby Panda',
				'Tiger Cub',
				'Baby Otter',
				'Baby Fox',
				'Baby Seal',
				'Fawn',
				'Baby Squirrel',
				'Hedgehog',
				'Baby Koala',
				'Baby Alpaca'
			]
		},
		zh: {
			title: '🐣 萌宠幼崽世界杯',
			description: '选出最可爱的动物宝宝',
			candidates: [
				'小狗',
				'小猫',
				'仓鼠',
				'兔子',
				'小鸡',
				'企鹅宝宝',
				'熊猫宝宝',
				'虎崽',
				'水獭宝宝',
				'狐狸宝宝',
				'海豹宝宝',
				'小鹿',
				'小松鼠',
				'刺猬',
				'考拉宝宝',
				'羊驼宝宝'
			]
		}
	},
	pet: {
		en: { title: '🐾 Pet Worldcup', description: 'Which companion would you live with?' },
		zh: { title: '🐾 宠物世界杯', description: '想和谁一起生活？' }
	},
	'travel-destination': {
		en: { title: '✈️ Travel Destination Worldcup', description: 'If you left right now' },
		zh: { title: '✈️ 旅行目的地世界杯', description: '如果现在就出发' }
	},
	mbti: {
		en: { title: '🔮 MBTI Worldcup', description: "What's your type?" },
		zh: { title: '🔮 MBTI 世界杯', description: '你是哪种类型？' }
	},
	season: {
		en: { title: '🌸 Best Season', description: "What's your pick?" },
		zh: { title: '🌸 最喜欢的季节', description: '你的选择是？' }
	}
};
