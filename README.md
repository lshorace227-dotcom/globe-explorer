# 寰宇地图册（globe-explorer）

交互式地理百科实验：3D 地球仪 → 点国家翻开图册 → 点省/州读简介。单文件、无构建、无 API key，数据实时来自 Wikipedia / Wikidata / geoBoundaries / Natural Earth。

## 运行

```bash
cd "/Users/lsh/dev/globe-explorer" && python3 -m http.server 8743
# 打开 http://localhost:8743/index.html
```

- `index.html` — 正式版（spec 见 `docs/superpowers/specs/`，验收报告见 `docs/reports/`）
- `mockups/` — 三方向评审原型（A 深空 / B 地图册 / C 应用卡片），不再维护

支持深链：`index.html#/c/156/r/3`（国家 ISO 数字码 / 地区序号），浏览器前进后退可用。

实验项目，可能随时整体删除。
