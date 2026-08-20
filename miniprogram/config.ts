// KD 卡牌数据接口（公开，无需鉴权）
export const CARD_API = 'https://1939.giaory.xyz/api/v1/cards';
export const CARD_PAGE_SIZE = 50;

// 云开发环境 ID —— 已配置为你的云环境
// 留占位符时，前端会自动回退为「直连」（仅开发期 urlCheck:false 可用）
export const CLOUD_ENV: string = 'cloud1-d1gpyuebz8be371fb';
// 云函数名（与 cloudfunctions/kardsProxy 目录对应）
export const CLOUD_FUNC = 'kardsProxy';

// 本地缓存 key
export const CARD_CACHE_PREFIX = 'kards_card_index';
export const CARD_CACHE_CHUNKS_KEY = 'kards_card_index_chunks';
export const DECK_STORAGE_KEY = 'kards_decks';

// 阵营码 -> 英文阵营名（卡组代码解析用）
export const FACTION_CODE_MAP: Record<string, string> = {
  '1': 'Germany',
  '2': 'Britain',
  '3': 'Japan',
  '4': 'Soviet',
  '5': 'USA',
  '6': 'France',
  '7': 'Italy',
  '8': 'Poland',
  '9': 'Finland',
  '10': 'Anzac',
  a: 'Anzac',
  A: 'Anzac',
};

// 英文阵营名 -> 阵营码（生成卡组代码用）
export const FACTION_TO_CODE: Record<string, string> = {
  Germany: '1',
  Britain: '2',
  Japan: '3',
  Soviet: '4',
  USA: '5',
  France: '6',
  Italy: '7',
  Poland: '8',
  Finland: '9',
  Anzac: 'a',
};

// 英文阵营名 -> 中文（筛选与展示用）
export const FACTION_NAME_ZH: Record<string, string> = {
  Germany: '德国',
  Britain: '英国',
  Japan: '日本',
  Soviet: '苏联',
  USA: '美国',
  France: '法国',
  Italy: '意大利',
  Poland: '波兰',
  Finland: '芬兰',
  Anzac: '澳新军团',
  Neutral: '中立',
};

// 可筛选的阵营列表（顺序即展示顺序）
export const FACTION_OPTIONS = [
  'Germany',
  'Britain',
  'Japan',
  'Soviet',
  'USA',
  'France',
  'Italy',
  'Poland',
  'Finland',
  'Anzac',
];
