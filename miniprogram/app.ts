import { initCardIndex } from './utils/cardData';
import { CLOUD_ENV } from './config';

App({
  globalData: {
    // 卡牌索引是否已就绪（解析卡组代码依赖它）
    cardIndexReady: false,
  },

  onLaunch() {
    // 云开发已配置时初始化（上线后请求走云函数代理，绕过域名白名单限制）
    if (wx.cloud && CLOUD_ENV && CLOUD_ENV !== 'YOUR_CLOUD_ENV_ID') {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
    }
    // 后台预加载卡牌索引；失败不阻塞使用，解析时再兜底重试
    initCardIndex()
      .then(() => {
        this.globalData.cardIndexReady = true;
      })
      .catch(() => {
        // 首次拉取失败保持 false，解析卡组代码时会再次尝试
      });
  },
});
