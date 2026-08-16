Page({
  data: {
    version: '0.1.0',
  },

  copySource() {
    wx.setClipboardData({
      data: 'https://1939.giaory.xyz',
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },
});
