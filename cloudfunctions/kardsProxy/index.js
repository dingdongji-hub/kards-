// KARDS 卡组存档 - 代理云函数
// 作用：在微信服务端请求未备案的第三方域名，绕过小程序域名白名单限制。
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const BASE = 'https://1939.giaory.xyz';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      // 跟随重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(httpGet(new URL(res.headers.location, url).toString()));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          buffer: Buffer.concat(chunks),
          type: res.headers['content-type'] || '',
        }),
      );
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

function pickMime(url, contentType) {
  if (contentType && contentType.startsWith('image/')) return contentType;
  if (url.includes('.avif')) return 'image/avif';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.webp')) return 'image/webp';
  if (url.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

exports.main = async (event) => {
  try {
    const action = event && event.action;

    if (action === 'cards') {
      const page = Number(event.page) || 1;
      const pages = Math.min(Number(event.pages) || 1, 34); // 单次最多批量 34 页
      const pageNumbers = [];
      for (let i = 0; i < pages; i++) pageNumbers.push(page + i);
      const results = await Promise.all(
        pageNumbers.map(async (p) => {
          try {
            const { buffer } = await httpGet(`${BASE}/api/v1/cards?limit=50&page=${p}`);
            return JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            return null;
          }
        }),
      );
      const valid = results.filter((r) => r && Array.isArray(r.data) && r.data.length > 0);
      if (valid.length === 0) return { ok: false, error: 'fetch cards failed' };
      const data = valid.flatMap((r) => r.data);
      const meta = valid[0].meta;
      return { ok: true, data: { data, meta } };
    }

    if (action === 'image') {
      const url = event && event.url;
      if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
        return { ok: false, error: 'invalid image url' };
      }
      const { buffer, type } = await httpGet(url);
      const base64 = buffer.toString('base64');
      const mime = pickMime(url, type);
      return { ok: true, data: `data:${mime};base64,${base64}` };
    }

    return { ok: false, error: 'unknown action: ' + action };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
};
