import { initCardIndex } from './utils/cardData';

App({
  globalData: {
    // 卡牌索引是否已就绪（解析卡组代码依赖它）
    cardIndexReady: false,
  },

  onLaunch() {
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
