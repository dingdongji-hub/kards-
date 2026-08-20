import { getCardIndex } from '../../utils/cardData';
import { parseDeckCode } from '../../utils/deckCode';
import { saveDeck, genId, getDeckById } from '../../utils/storage';
import { Deck, ParseResult } from '../../utils/types';
import { FACTION_NAME_ZH } from '../../config';

const DEFAULT_TAGS = ['快攻', '中速', '控制', '变速', '整活'];

interface Preview extends ParseResult {
  mainFactionName: string;
  allyFactionName: string;
}

interface TagOption {
  name: string;
  selected: boolean;
}

Page({
  data: {
    id: '',
    name: '',
    deckCode: '',
    parsing: false,
    parseError: '',
    preview: null as Preview | null,
    tagOptions: [] as TagOption[],
    created_at: 0,
  },

  onLoad(options: any) {
    const tagOptions: TagOption[] = DEFAULT_TAGS.map((t) => ({ name: t, selected: false }));
    const patch: any = { tagOptions };
    if (options && options.id) {
      const deck = getDeckById(options.id);
      if (deck) {
        const selectedSet = new Set(deck.tags || []);
        tagOptions.forEach((t) => {
          t.selected = selectedSet.has(t.name);
        });
        Object.assign(patch, {
          id: deck.id,
          name: deck.name,
          deckCode: deck.deck_code,
          created_at: deck.created_at,
        });
      }
    }
    this.setData(patch);
  },

  onNameInput(e: any) {
    this.setData({ name: e.detail.value });
  },

  onCodeInput(e: any) {
    this.setData({ deckCode: e.detail.value, parseError: '', preview: null });
  },

  async onParse() {
    const { deckCode } = this.data;
    if (!deckCode.trim()) {
      this.setData({ parseError: '请先粘贴卡组代码' });
      return;
    }
    this.setData({ parsing: true, parseError: '' });
    wx.showLoading({ title: '加载卡牌数据中…', mask: true });
    try {
      const index = await getCardIndex();
      wx.hideLoading();
      const result = parseDeckCode(deckCode, index);
      if (!result.ok) {
        this.setData({ parsing: false, parseError: result.error || '解析失败' });
        return;
      }
      const preview: Preview = {
        ...result,
        mainFactionName: FACTION_NAME_ZH[result.mainFaction || ''] || result.mainFaction || '未知',
        allyFactionName: result.allyFaction ? FACTION_NAME_ZH[result.allyFaction] || result.allyFaction : '',
      };
      this.setData({
        parsing: false,
        preview,
        name: this.data.name || result.name || '',
      });
    } catch (err) {
      wx.hideLoading();
      this.setData({ parsing: false, parseError: '卡牌数据加载失败，请检查网络后重试' });
    }
  },

  toggleTag(e: any) {
    const name = e.currentTarget.dataset.tag;
    const tagOptions = this.data.tagOptions.map((t: TagOption) =>
      t.name === name ? { name: t.name, selected: !t.selected } : t,
    );
    this.setData({ tagOptions });
  },

  onSave() {
    const { preview, name, deckCode, tagOptions, id, created_at } = this.data;
    if (!preview) {
      this.setData({ parseError: '请先解析卡组代码' });
      return;
    }
    const selectedTags = tagOptions.filter((t: TagOption) => t.selected).map((t: TagOption) => t.name);
    const now = Date.now();
    const deck: Deck = {
      id: id || genId(),
      name: name.trim() || '未命名卡组',
      deck_code: deckCode.trim(),
      main_faction: preview.mainFaction || '',
      ally_faction: preview.allyFaction || '',
      cards: preview.cards || [],
      tags: selectedTags,
      created_at: created_at || now,
      updated_at: now,
    };
    saveDeck(deck);
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },
});
