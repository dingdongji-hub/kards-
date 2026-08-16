import { getDeckById, removeDeck } from '../../utils/storage';
import { getCardIndex } from '../../utils/cardData';
import { FACTION_NAME_ZH } from '../../config';

interface CardView {
  import_id: string;
  count: number;
  name: string;
  faction: string;
  type: string;
  kredits: number;
  image: string;
}

interface CurveItem {
  cost: number;
  count: number;
}

Page({
  data: {
    deck: null as any,
    cards: [] as CardView[],
    costCurve: [] as CurveItem[],
    maxCost: 1,
    totalCards: 0,
    mainFactionName: '',
    allyFactionName: '',
  },

  onLoad(options: any) {
    const deck = getDeckById(options.id);
    if (!deck) {
      wx.showToast({ title: '卡组不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({
      deck,
      mainFactionName: FACTION_NAME_ZH[deck.main_faction] || deck.main_faction || '未知',
      allyFactionName: deck.ally_faction ? FACTION_NAME_ZH[deck.ally_faction] || deck.ally_faction : '',
    });
    this.renderCards(deck);
  },

  async renderCards(deck: any) {
    try {
      const index = await getCardIndex();
      const cards: CardView[] = deck.cards.map((c: any) => {
        const card = index[c.import_id];
        return {
          import_id: c.import_id,
          count: c.count,
          name: card ? card.name_zh || card.name_en : c.import_id,
          faction: card ? card.faction : '',
          type: card ? card.type : '',
          kredits: card ? card.kredits : 0,
          image: card ? card.image_proxy_url : '',
        };
      });
      cards.sort((a, b) => a.kredits - b.kredits || a.name.localeCompare(b.name));

      const curve: CurveItem[] = Array.from({ length: 13 }, (_, i) => ({ cost: i, count: 0 }));
      cards.forEach((c) => {
        if (c.kredits >= 0 && c.kredits <= 12) curve[c.kredits].count += c.count;
      });
      const maxCost = Math.max(1, ...curve.map((c) => c.count));

      this.setData({
        cards,
        costCurve: curve,
        maxCost,
        totalCards: cards.reduce((s, c) => s + c.count, 0),
      });
    } catch (e) {
      wx.showToast({ title: '卡牌数据加载失败', icon: 'none' });
    }
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.deck.deck_code,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  goEdit() {
    wx.navigateTo({ url: `/pages/deck-edit/deck-edit?id=${this.data.deck.id}` });
  },

  onDelete() {
    wx.showModal({
      title: '删除卡组',
      content: '确定删除这个卡组吗？',
      success: (res: any) => {
        if (res.confirm) {
          removeDeck(this.data.deck.id);
          wx.navigateBack();
        }
      },
    });
  },
});
