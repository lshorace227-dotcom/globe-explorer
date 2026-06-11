# 寰宇 · 互动地球百科 — 方向 Mockup

三个交互/视觉方向的可运行原型，供评审选型。全部为单文件 HTML（CDN 依赖，无构建）。

## 打开方式

```bash
cd "/Users/lsh/dev/globe-explorer/mockups"
python3 -m http.server 8742
# 浏览器打开：
#   http://localhost:8742/mockup-a-deep-space.html
#   http://localhost:8742/mockup-b-atlas.html
#   http://localhost:8742/mockup-c-app-card.html
```

需联网（国界/省界与维基简介均实时拉取）。

## 三个方向

| 文件 | 方向 | 一句话 |
|------|------|--------|
| `mockup-a-deep-space.html` | A 深空产品风 | 全程留在 3D 球上：点国家相机飞近，省界直接铺在球面，右侧玻璃拟态信息面板 |
| `mockup-b-atlas.html` | B 地图册风 | 3D 球点国家后「翻页」进入该国平面大地图 + 杂志式编辑栏，点省份换文章 |
| `mockup-c-app-card.html` | C 应用卡片风 | 明亮 3D 球 + 底部上滑卡片 + 横滑地区 chips，App 化信息架构（未来手机端方向） |

## 体验路径

拖拽旋转 / 滚轮缩放 → 点击 **中国 / 美国 / 巴西 / 澳大利亚 / 日本 / 俄罗斯 / 印度 / 德国 / 法国 / 加拿大**（演示版仅这十国开放省级下钻）→ 点击任意省/州看简介 → 面包屑/返回键回退。

## 数据链路（三个方向共用，已验证）

- 国界：world-atlas（Natural Earth 110m，CDN TopoJSON）
- 省/州界：geoBoundaries API → GitHub LFS 媒体直链（按国家点击后按需加载，已做环绕方向 rewind 修复）
- 简介：中文名→zh 维基 action API（`variant=zh-cn` 简体）；英文名→en 维基 summary 拿 Wikidata Q 号→桥接 zhwiki 条目→简体摘要；中文维基缺失自动退英文

## 已知局限（mockup 级，生产版可解）

- 方向 C 的地区 chips 在点击前显示英文名（批量中文化需 Wikidata 批查询或本地缓存层）
- 演示版仅十国开放省级下钻（生产版用 ISO 数字码→alpha-3 全量映射后全球开放）
- 维基简介逐条实时拉取，无持久缓存
