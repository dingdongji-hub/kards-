import { FACTION_CODE_MAP, FACTION_TO_CODE } from '../config';
import { CardIndex, DeckCard, ParseResult } from './types';

/**
 * 解析 KARDS 卡组代码。
 * 格式：%%[主阵营码][盟国码]|[段0];[段1];[段2];[段3]
 * 第 n 段（0 起）卡牌数量 = n+1；段内每 2 字符一个 import_id。
 */
export function parseDeckCode(code: string, cardIndex: CardIndex): ParseResult {
  const trimmed = (code || '').trim();
  if (!trimmed) return { ok: false, error: '请粘贴卡组代码' };

  // 卡组名（可选）：代码前非 %% 开头的第一行
  let name = '';
  const lines = trimmed.split('\n');
  if (lines.length > 1) {
    const firstLine = lines[0].trim();
    if (firstLine && !firstLine.startsWith('%%')) {
      name = firstLine;
    }
  }

  // 只取 %% 到行尾
  let body = trimmed;
  const idx = body.indexOf('%%');
  if (idx !== -1) {
    body = body.substring(idx).split('\n')[0].trim();
  }

  const m = body.match(/^%%(10|[1-9a-fA-F])(10|[1-9a-fA-F])?\|(.+)$/);
  if (!m) return { ok: false, error: '卡组代码格式无法识别' };

  const mainFaction = FACTION_CODE_MAP[m[1]] || '';
  const allyFaction = m[2] ? FACTION_CODE_MAP[m[2]] || '' : '';
  const segments = m[3].split(';');

  const countMap: Record<string, number> = {};
  segments.forEach((seg, y) => {
    const count = y + 1;
    for (let i = 0; i < seg.length; i += 2) {
      const importId = seg.substring(i, i + 2);
      if (importId.length < 2) continue;
      if (cardIndex[importId]) {
        countMap[importId] = (countMap[importId] || 0) + count;
      }
    }
  });

  const cards: DeckCard[] = Object.entries(countMap)
    .map(([import_id, count]) => ({ import_id, count }))
    .sort((a, b) => a.import_id.localeCompare(b.import_id));

  if (cards.length === 0) {
    return { ok: false, error: '未解析到任何卡牌（卡牌数据可能未就绪，请稍后重试）' };
  }

  const totalCards = cards.reduce((s, c) => s + c.count, 0);
  return { ok: true, name, mainFaction, allyFaction, cards, totalCards };
}

/**
 * 生成卡组代码（反向，主要用于导出/未来手动组卡）。
 * 复制回游戏请优先使用原始 deck_code，避免格式漂移。
 */
export function buildDeckCode(
  mainFaction: string,
  allyFaction: string,
  cards: DeckCard[],
): string {
  const buckets: string[][] = [[], [], [], []]; // index 0..3 对应数量 1..4
  for (const c of cards) {
    const idx = c.count - 1;
    if (idx >= 0 && idx < 4) {
      buckets[idx].push(c.import_id);
    }
  }
  // 去掉末尾的空段（中间空段需保留，以维持「第 n 段 = n+1 张」的语义）
  let last = buckets.length - 1;
  while (last >= 0 && buckets[last].length === 0) last--;
  const segments =
    last >= 0 ? buckets.slice(0, last + 1).map((b) => b.join('')).join(';') : '';
  const main = FACTION_TO_CODE[mainFaction] || '';
  const ally = allyFaction ? FACTION_TO_CODE[allyFaction] || '' : '';
  return `%%${main}${ally}|${segments}`;
}
