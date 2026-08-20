import {
  CARD_API,
  CARD_PAGE_SIZE,
  CARD_CACHE_PREFIX,
  CARD_CACHE_CHUNKS_KEY,
  CLOUD_ENV,
  CLOUD_FUNC,
} from '../config';
import { Card, CardIndex } from './types';

const CHUNK_SIZE = 500; // 每片缓存 500 张，规避 storage 单 key 大小限制
const CLOUD_BATCH = 20; // 云函数单次批量拉取的最大页数（约 1000 张，控制返回体积 < 1MB）
const DIRECT_CONCURRENCY = 6; // 直连模式的并发数

interface PageResult {
  data: Card[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

// 云开发是否已配置（占位符视为未配置）
function cloudReady(): boolean {
  return !!(wx.cloud && CLOUD_ENV && CLOUD_ENV !== 'YOUR_CLOUD_ENV_ID');
}

// 直连 KD（仅开发期 urlCheck:false 时可用）
function requestDirect(page: number): Promise<PageResult> {
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

// 云函数批量拉取：一次调用并发拉取 pages 页并合并返回
function requestViaCloud(page: number, pages: number): Promise<PageResult> {
  return wx.cloud
    .callFunction({
      name: CLOUD_FUNC,
      data: { action: 'cards', page, pages },
    })
    .then((res: any) => {
      const r = res && res.result;
      if (r && r.ok && r.data && Array.isArray(r.data.data)) {
        return r.data as PageResult;
      }
      throw new Error('cloud proxy failed');
    });
}

// 单页拉取：云函数优先，失败回退直连；整体失败重试
async function requestPageWithRetry(page: number, retries = 2): Promise<PageResult | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      if (cloudReady()) {
        try {
          return await requestViaCloud(page, 1);
        } catch (e) {
          return await requestDirect(page); // 云函数失败回退直连（开发期兜底）
        }
      }
      return await requestDirect(page);
    } catch (e) {
      // 本轮失败，继续重试
    }
  }
  return null;
}

function addCards(index: CardIndex, cards: Card[]): void {
  for (const c of cards) {
    if (c && c.import_id) {
      index[c.import_id] = c;
    }
  }
}

// 拉取全量卡牌：云函数批量（每批 20 页）或直连并发（每批 6 页），单页失败不致命
async function fetchAllCards(): Promise<CardIndex> {
  const index: CardIndex = {};
  const first = await requestPageWithRetry(1);
  if (!first) {
    throw new Error('无法获取卡牌数据');
  }
  addCards(index, first.data);
  const totalPages = Math.ceil(first.meta.total / CARD_PAGE_SIZE);

  const batchSize = cloudReady() ? CLOUD_BATCH : DIRECT_CONCURRENCY;
  for (let start = 2; start <= totalPages; start += batchSize) {
    const pageNums: number[] = [];
    for (let p = start; p < start + batchSize && p <= totalPages; p++) pageNums.push(p);

    let results: (PageResult | null)[];
    if (cloudReady()) {
      // 云函数批量：一次调用拿多页
      const batch = await requestViaCloud(start, pageNums.length).catch(() => null);
      if (batch && Array.isArray(batch.data) && batch.data.length > 0) {
        results = [batch];
      } else {
        // 批量失败：逐页并发回退
        results = await Promise.all(pageNums.map((p) => requestPageWithRetry(p)));
      }
    } else {
      results = await Promise.all(pageNums.map((p) => requestPageWithRetry(p)));
    }
    for (const r of results) {
      if (r) addCards(index, r.data);
    }
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
let inflight: Promise<CardIndex> | null = null;

// 初始化卡牌索引：优先读缓存，否则拉全量并缓存；
// 并发调用共享同一 Promise（app 启动预加载与解析时请求不会重复拉取）
export function initCardIndex(): Promise<CardIndex> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const fromCache = loadCachedIndex();
      if (fromCache) {
        cachedIndex = fromCache;
        return fromCache;
      }
      const index = await fetchAllCards();
      cachedIndex = index;
      saveIndex(index);
      return index;
    } finally {
      inflight = null; // 无论成败都清空，失败后允许下次重试
    }
  })();
  return inflight;
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

/**
 * 获取卡图。
 * 上线后通过云函数代理下载卡图并返回 base64（image 组件可直接显示）；
 * 开发期（未配置云开发）直接返回原始代理 URL。
 */
export async function getCardImage(proxyUrl: string): Promise<string> {
  if (!proxyUrl) return '';
  if (cloudReady()) {
    try {
      const res: any = await wx.cloud.callFunction({
        name: CLOUD_FUNC,
        data: { action: 'image', url: proxyUrl },
      });
      const r = res && res.result;
      if (r && r.ok && r.data) return r.data;
    } catch (e) {
      // 失败回退直连
    }
  }
  return proxyUrl;
}
