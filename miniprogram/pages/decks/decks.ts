import { getDecks, removeDeck, exportDecksJson, importDecksJson } from '../../utils/storage';
import { Deck } from '../../utils/types';
import { FACTION_NAME_ZH, FACTION_OPTIONS } from '../../config';

interface DeckView extends Deck {
  mainFactionName: string;
  allyFactionName: string;
  cardCount: number;
}

Page({
  data: {
    decks: [] as DeckView[],
    keyword: '',
    mainFaction: '',
    allyFaction: '',
    mainFactionIndex: 0,
    allyFactionIndex: 0,
    factionOptions: [] as { code: string; name: string }[],
  },

  allDecks: [] as DeckView[],

  onLoad() {
    const options = [{ code: '', name: '全部' }].concat(
      FACTION_OPTIONS.map((f) => ({ code: f, name: FACTION_NAME_ZH[f] })),
    );
    this.setData({ factionOptions: options });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const all: DeckView[] = getDecks().map((d) => ({
      ...d,
      mainFactionName: FACTION_NAME_ZH[d.main_faction] || d.main_faction || '未知',
      allyFactionName: d.ally_faction ? FACTION_NAME_ZH[d.ally_faction] || d.ally_faction : '',
      cardCount: d.cards.reduce((s, c) => s + c.count, 0),
    }));
    this.allDecks = all;
    this.applyFilter();
  },

  applyFilter() {
    const { keyword, mainFaction, allyFaction } = this.data;
    const kw = keyword.trim().toLowerCase();
    const decks = this.allDecks.filter((d: DeckView) => {
      if (mainFaction && d.main_faction !== mainFaction) return false;
      if (allyFaction && d.ally_faction !== allyFaction) return false;
      if (kw) {
        const hay = `${d.name} ${d.main_faction} ${d.ally_faction} ${(d.tags || []).join(' ')}`.toLowerCase();
        if (hay.indexOf(kw) === -1) return false;
      }
      return true;
    });
    this.setData({ decks });
  },

  onKeywordInput(e: any) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  onMainFactionChange(e: any) {
    const idx = Number(e.detail.value);
    const opt = this.data.factionOptions[idx];
    this.setData({ mainFactionIndex: idx, mainFaction: opt ? opt.code : '' });
    this.applyFilter();
  },

  onAllyFactionChange(e: any) {
    const idx = Number(e.detail.value);
    const opt = this.data.factionOptions[idx];
    this.setData({ allyFactionIndex: idx, allyFaction: opt ? opt.code : '' });
    this.applyFilter();
  },

  clearFilters() {
    this.setData({
      keyword: '',
      mainFaction: '',
      allyFaction: '',
      mainFactionIndex: 0,
      allyFactionIndex: 0,
    });
    this.applyFilter();
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/deck-edit/deck-edit' });
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/deck-detail/deck-detail?id=${id}` });
  },

  onDelete(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除卡组',
      content: '确定删除这个卡组吗？',
      success: (res: any) => {
        if (res.confirm) {
          removeDeck(id);
          this.refresh();
        }
      },
    });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  exportBackup() {
    const json = exportDecksJson();
    wx.setClipboardData({
      data: json,
      success: () => wx.showToast({ title: '备份已复制到剪贴板', icon: 'success' }),
    });
  },

  importBackup() {
    wx.showModal({
      title: '导入备份',
      editable: true,
      placeholderText: '粘贴之前导出的备份内容',
      success: (res: any) => {
        if (!res.confirm) return;
        const text = (res.content || '').trim();
        if (!text) {
          wx.showToast({ title: '未输入内容', icon: 'none' });
          return;
        }
        const result = importDecksJson(text);
        if (result.ok) {
          wx.showToast({ title: `已导入 ${result.count} 个卡组`, icon: 'success' });
          this.refresh();
        } else {
          wx.showModal({
            title: '导入失败',
            content: result.error || '未知错误',
            showCancel: false,
          });
        }
      },
    });
  },
});
