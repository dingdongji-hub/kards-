# KARDS 卡组存档（微信小程序）

微信内「卡组码一键存档 + 快速查找」的极简工具。帮玩家把超出游戏内卡组槽位上限的多余卡组，用粘贴卡组代码的方式存档，并按关键字 / 主国 / 盟国 / 标签快速筛选。

**特点**：本地优先、零门槛、零后端（数据只存在本机），预留云同步扩展。

技术方案见 [`docs/技术方案.md`](docs/技术方案.md)。

## 目录结构

```
├── project.config.json      # 微信开发者工具项目配置
├── tsconfig.json
├── package.json
├── typings/                 # 最小全局类型声明
├── docs/技术方案.md
├── cloudfunctions/          # 云函数（上线代理用）
│   └── kardsProxy/          # 卡牌数据 + 卡图代理
└── miniprogram/             # 小程序源码
    ├── app.ts / app.json / app.wxss
    ├── config.ts            # KD 接口、阵营映射
    ├── utils/
    │   ├── types.ts         # 类型定义
    │   ├── cardData.ts      # 卡牌数据拉取 + 本地缓存
    │   ├── deckCode.ts      # 卡组代码解析 / 生成
    │   └── storage.ts       # 存储层抽象（预留云同步）
    └── pages/
        ├── decks/           # 卡组列表（搜索 + 筛选）
        ├── deck-edit/       # 添加/编辑（粘贴代码）
        ├── deck-detail/     # 卡组详情（复制代码）
        └── about/           # 关于 / 合规
```

## 运行方式

1. 安装 **微信开发者工具**（[下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)）。
2. 「导入项目」，目录选择本项目根目录（`project.config.json` 所在目录）。
3. AppID：
   - 没有注册小程序 AppID 时，可用「测试号」（工具会自动分配）；
   - `project.config.json` 里默认写的是 `touristappid`，可改成你自己的 AppID。
4. 首次打开会自动拉取卡牌数据（约 1613 张，来自 KARDS DECKER 公开接口），之后缓存到本地。

## 上线发布（云开发代理）

卡牌数据与卡图来自 `https://1939.giaory.xyz`，该域名未备案，**无法直接配置为小程序合法域名**。因此上线采用「云开发代理」：小程序请求云函数，云函数在微信服务端转发到该域名，绕过域名白名单限制。

### 部署步骤

1. 微信开发者工具 →「云开发」→ 开通并创建一个环境，复制「环境 ID」。
2. 把 `miniprogram/config.ts` 里的 `CLOUD_ENV` 改成你的环境 ID。
3. 在工具左侧 `cloudfunctions/kardsProxy` 上右键 →「上传并部署：云端安装依赖」。
4. 重新编译小程序，卡牌数据与卡图即改走云函数代理；提交审核无需再配置 `1939.giaory.xyz` 域名。

### 开发期（未配置云开发时）

- `CLOUD_ENV` 保持占位符 `YOUR_CLOUD_ENV_ID` 时，前端自动回退为**直连** `1939.giaory.xyz`。
- 此时需在工具「详情 → 本地设置」勾选「不校验合法域名」。

## 合规

- 非官方工具；卡牌中文数据与卡图由 KARDS DECKER 提供；KARDS 及其素材版权归 1939 Games，遵守其 Community Content Policy，仅供个人学习交流与非商业用途。
