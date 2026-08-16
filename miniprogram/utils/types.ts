// 卡牌（KD 接口返回的精简字段）
export interface Card {
  card_id: string;
  import_id: string;
  name_zh: string;
  name_en: string;
  faction: string;
  type: string;
  rarity: string;
  kredits: number;
  attack: number;
  defense: number;
  set: string;
  image_proxy_url: string;
}

// 卡牌索引：import_id（2 字符短码）-> 卡牌
export type CardIndex = Record<string, Card>;

// 卡组内单张卡牌（含数量）
export interface DeckCard {
  import_id: string;
  count: number;
}

// 卡组（存档对象）
export interface Deck {
  id: string;
  name: string;
  deck_code: string;       // 原始代码，复制回游戏用
  main_faction: string;    // 英文阵营名，如 "Soviet"
  ally_faction: string;    // 英文阵营名或空字符串
  cards: DeckCard[];       // 解析后的卡牌明细
  tags: string[];
  created_at: number;
  updated_at: number;
}

// 卡组代码解析结果
export interface ParseResult {
  ok: boolean;
  error?: string;
  name?: string;
  mainFaction?: string;
  allyFaction?: string;
  cards?: DeckCard[];
  totalCards?: number;
}
