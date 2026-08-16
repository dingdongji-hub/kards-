import { DECK_STORAGE_KEY } from '../config';
import { Deck } from './types';

/**
 * 存储层抽象：业务代码只调用这里的接口，不直接碰 wx.setStorageSync。
 * 将来迁移云同步时，新增 cloudStorage 实现同一套接口即可，业务代码零改动。
 */

export function getDecks(): Deck[] {
  try {
    const list = wx.getStorageSync(DECK_STORAGE_KEY);
    return Array.isArray(list) ? (list as Deck[]) : [];
  } catch (e) {
    return [];
  }
}

export function getDeckById(id: string): Deck | undefined {
  return getDecks().find((d) => d.id === id);
}

export function saveDeck(deck: Deck): void {
  const decks = getDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) {
    decks[idx] = deck;
  } else {
    decks.push(deck);
  }
  wx.setStorageSync(DECK_STORAGE_KEY, decks);
}

export function removeDeck(id: string): void {
  const decks = getDecks().filter((d) => d.id !== id);
  wx.setStorageSync(DECK_STORAGE_KEY, decks);
}

// 全量替换（导入备份用）
export function replaceDecks(decks: Deck[]): void {
  wx.setStorageSync(DECK_STORAGE_KEY, decks);
}

export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 导出全部卡组为 JSON 字符串（备份用）
export function exportDecksJson(): string {
  return JSON.stringify(getDecks());
}

// 从 JSON 字符串导入卡组（备份恢复用）
export function importDecksJson(
  json: string,
): { ok: boolean; count?: number; error?: string } {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: '数据格式不正确：应为卡组数组' };
    }
    for (const d of parsed) {
      if (
        !d ||
        typeof d.id !== 'string' ||
        typeof d.deck_code !== 'string' ||
        !Array.isArray(d.cards)
      ) {
        return { ok: false, error: '数据格式不正确：卡组字段缺失' };
      }
    }
    replaceDecks(parsed as Deck[]);
    return { ok: true, count: parsed.length };
  } catch (e) {
    return { ok: false, error: 'JSON 解析失败，请确认粘贴的是完整备份内容' };
  }
}
