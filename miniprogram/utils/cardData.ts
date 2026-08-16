import {
  CARD_API,
  CARD_PAGE_SIZE,
  CARD_CACHE_PREFIX,
  CARD_CACHE_CHUNKS_KEY,
} from '../config';
import { Card, CardIndex } from './types';

const CHUNK_SIZE = 500; // 每片缓存 500 张，规避 storage 单 key 大小限制

interface PageResult {
  data: Card[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

function requestPage(page: number): Promise<PageResult> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: CARD_API,
      data: { limit: CARD_PAGE_SIZE, page },
      success: (res: any) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.data)) {
          resolve(res.data as PageResult);
        } else {
          reject(new Error('cards api status ' + res.statusCode));
        }
      },
      fail: (err: any) => reject(err),
    });
  });
}

function addCards(index: CardIndex, cards: Card[]): void {
  for (const c of cards) {
    if (c && c.import_id) {
      index[c.import_id] = c;
    }
  }
}

async function fetchAllCards(): Promise<CardIndex> {
  const index: CardIndex = {};
  const first = await requestPage(1);
  addCards(index, first.data);
  const totalPages = Math.ceil(first.meta.total / CARD_PAGE_SIZE);
  for (let page = 2; page <= totalPages; page++) {
    const res = await requestPage(page);
    addCards(index, res.data);
  }
  return index;
}

function saveIndex(index: CardIndex): void {
  const entries = Object.entries(index);
  const chunkCount = Math.ceil(entries.length / CHUNK_SIZE);
  for (let i = 0; i < chunkCount; i++) {
    const chunk: CardIndex = {};
    const slice = entries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    for (const [k, v] of slice) chunk[k] = v;
    try {
      wx.setStorageSync(`${CARD_CACHE_PREFIX}_${i}`, chunk);
    } catch (e) {
      // 单片写入失败不致命，读取时视为缓存未就绪
    }
  }
  wx.setStorageSync(CARD_CACHE_CHUNKS_KEY, chunkCount);
}

function loadCachedIndex(): CardIndex | null {
  try {
    const chunkCount = wx.getStorageSync(CARD_CACHE_CHUNKS_KEY);
    if (!chunkCount || chunkCount <= 0) return null;
    const index: CardIndex = {};
    for (let i = 0; i < chunkCount; i++) {
      const chunk = wx.getStorageSync(`${CARD_CACHE_PREFIX}_${i}`);
      if (!chunk) return null;
      Object.assign(index, chunk);
    }
    return Object.keys(index).length > 0 ? index : null;
  } catch (e) {
    return null;
  }
}

let cachedIndex: CardIndex | null = null;

// 初始化卡牌索引：优先读缓存，否则拉全量并缓存
export async function initCardIndex(): Promise<CardIndex> {
  if (cachedIndex) return cachedIndex;
  const fromCache = loadCachedIndex();
  if (fromCache) {
    cachedIndex = fromCache;
    return fromCache;
  }
  const index = await fetchAllCards();
  cachedIndex = index;
  saveIndex(index);
  return index;
}

// 获取卡牌索引（解析卡组代码前调用，未就绪会自动拉取）
export async function getCardIndex(): Promise<CardIndex> {
  if (cachedIndex) return cachedIndex;
  return initCardIndex();
}

// 清空本地卡牌缓存（调试/强制刷新用）
export function clearCardCache(): void {
  try {
    const chunkCount = wx.getStorageSync(CARD_CACHE_CHUNKS_KEY) || 0;
    for (let i = 0; i < chunkCount; i++) {
      wx.removeStorageSync(`${CARD_CACHE_PREFIX}_${i}`);
    }
    wx.removeStorageSync(CARD_CACHE_CHUNKS_KEY);
  } catch (e) {
    // ignore
  }
  cachedIndex = null;
}
