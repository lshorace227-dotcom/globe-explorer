# 寰宇地图册（globe-explorer）v1 设计 Spec

日期：2026-06-11 ｜ 状态：已批准（方向 B「地图册风」，经三方向 mockup 评审选定）

## 1. 背景与定位

副业产品方向探索实验：验证「交互式地理百科」是否值得做成产品。**实验性质，可能一个月后整体删除**——所有取舍向「随时可扔」倾斜：单文件、无构建、无后端、无 API key。

UI 与内容输出全部简体中文；专业术语与代码标识符保留英文。

## 2. 用户体验流程

1. **地球仪页**：打开即见纸质地图册风格的 3D 正交投影地球仪（纸面 #f6f1e7、墨线、经纬网、刊头双横线）。拖拽旋转、滚轮缩放、hover 国家高亮（terracotta 半透明）并在球下方显示国名（中文）。
2. **点击任意国家**：投影动画转向该国并放大，整页 crossfade「翻页」进入**国家详情页**——左栏（58%）该国平面大地图铺满省/州（ADM1）多边形，右栏（42%）编辑式文章：中文国名特大衬线标题、英文名 small-caps、维基简介（简体、两端对齐）、图版（维基缩略图+图注）、维基外链、行政区两列列表。
3. **点击省/州**（地图多边形或列表项，双向 hover 联动）：右栏平滑替换为**地区文章**（中文地区名、简介、图版、维基外链、返回链接）；地图上该区 terracotta 实色高亮。
4. **回退**：「← 返回地球仪」「← 返回 {国家}」、面包屑、**浏览器返回键**（hash 路由）行为一致。

## 3. 范围

**v1 做**：
- 全球所有国家（world-atlas 110m，约 177 个形状）可点击进入详情页
- 有 ADM1 数据的国家全部开放省级下钻；无数据国家优雅降级（只显示国家文章 + 「该国暂无省级行政区数据」）
- 简介内容/图片 100% 实时拉维基百科（简体优先，英文兜底）
- 行政区列表中文名后台渐进解析 + localStorage 缓存
- hash 路由（`#/`、`#/c/<numericId>`、`#/c/<numericId>/r/<index>`）支持浏览器前进/返回
- 基础响应式：窄屏（<900px）国家详情页左右栏改上下堆叠

**v1 不做**（future）：搜索、收藏、二级行政区、移动 App、部署（GitHub Pages 等）、SEO、多语言切换。

## 4. 技术架构

- **形态**：`index.html` 单文件（内联 CSS/JS），浏览器直接运行；本地 `python3 -m http.server` 或 file:// 打开（所有外部资源均 CORS `*`）。
- **依赖（CDN，已实测可用）**：
  - `https://cdn.jsdelivr.net/npm/d3@7`
  - `https://cdn.jsdelivr.net/npm/topojson-client@3`
  - Google Fonts `Noto Serif SC`（400/600/900）
- **基准**：视觉与交互以 `mockups/mockup-b-atlas.html`（已评审通过）为基准，下述产品化差异除外。
- **代码组织**（单文件内按区块注释分层）：常量/状态 → 数据层 → 地球仪视图 → 国家视图 → 路由 → 测试钩子。

### 与 mockup B 的产品化差异

| # | mockup B | v1 正式版 |
|---|----------|-----------|
| 1 | 十国演示白名单（DEMO 表） | 内置 `COUNTRY_TABLE`（约 250 行：ISO numeric → alpha-3 + 中文名），全球开放 |
| 2 | 非演示国家侧卡片 | 删除该路径：所有国家统一进详情页 |
| 3 | 行政区列表英文名，点击后才中文化 | 进入国家页后后台并发解析中文名（见 5.4），就地更新列表 |
| 4 | 无缓存（仅内存） | localStorage 缓存（见 5.5） |
| 5 | 无路由 | hash 路由 + popstate |
| 6 | 无降级提示 | ADM1 缺失/接口失败的降级与重试文案 |
| 7 | 仅 USA 详情页取景剔除远洋属地 | 通用化：详情页投影 fitExtent 以**最大面积多边形所在主体**为基准（覆盖 FRA/NLD/NZL/RUS 等跨经线或含海外领地国家），其余多边形仍绘制 |

## 5. 数据层规格（全部已在 mockup 阶段实测验证）

### 5.1 内置国家表（结构性数据，非内容）

```js
const COUNTRY_TABLE = { 156:{a3:'CHN',zh:'中国'}, 840:{a3:'USA',zh:'美国'}, /* …约 250 行 */ };
```

生成方式（实施时一次性执行，结果内联进 index.html，不做运行时依赖）——Wikidata SPARQL：

```sparql
SELECT ?num ?a3 ?zh WHERE {
  ?c wdt:P299 ?num ; wdt:P298 ?a3 .
  OPTIONAL { ?c rdfs:label ?zh . FILTER(LANG(?zh)="zh") }
}
```

world-atlas 中少数争议地区（科索沃、北塞浦路斯、索马里兰）的 `id` 为 **undefined**（2026-06-11 实测纠正，原假设为共用 `-99`）：init 时分配稳定的合成负数 id（-1/-2/-3）以支持路由寻址；表中无映射，显示 `properties.name` 英文名（维基命中中文后回填），点击走「无 ADM1」降级路径，不报错。

### 5.2 边界数据

- **国界**：`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`（TopoJSON，`objects.countries`，`Number(f.id)` 归一化前导零）。
- **ADM1**：`https://www.geoboundaries.org/api/current/gbOpen/{a3}/ADM1/` → `meta.simplifiedGeometryGeoJSON`。该 URL 是 `github.com/...…/raw/<sha>/<path>` 形式，**改写为 `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/<sha>/<path>`**（LFS 媒体直链，CORS `*`，省一次 302 跳转；jsdelivr / raw.githubusercontent 只返回 131B 的 LFS 指针文件）。改写失败时回退原 URL。另：geoBoundaries 的 404 错误页**不带 CORS 头**，浏览器侧 fetch 直接抛异常拿不到状态码——meta 请求抛错时按 `navigator.onLine` 判别（在线归 nodata、离线归 error）。
- **rewind（必须）**：geoBoundaries 多边形环绕方向不统一，d3 球面填充约定外环顺时针、内环逆时针，不 rewind 会出现填充反转/三角撕裂。对每个 feature 的每个环计算有符号面积并按需 reverse（mockup 中 `rewindFeature` 实现原样沿用）。
- ADM1 meta 404 / features 为空 → 视为「无省级数据」降级。

### 5.3 维基简介链路

```
fetchWiki(name):
  含 CJK 字符 → zhSummary(name)
  否则 → enSummary(name)        # en REST summary，拿 extract + wikibase_item(Q号)
         ├─ 404 时剥行政后缀重试（Province/State/Oblast/… 正则）
         ├─ qid → Wikidata wbgetentities sitelinks/zhwiki → 中文条目名
         ├─ 有中文条目 → zhSummary(中文名)（命中即返回 zh 结果）
         └─ 否则返回 en 结果
```

- `zhSummary`：zh 维基 **action API**（非 REST）：`action=query&prop=extracts|pageimages|info&inprop=url|varianttitles&exintro&explaintext&exsentences=5&redirects&converttitles&piprop=thumbnail&pithumbsize=480&variant=zh-cn&origin=*`。标题取 `varianttitles['zh-cn']`（REST API 与 Accept-Language 均不做简繁转换，已实测）。
- 返回统一结构 `{lang, title, extract, thumb, url}`；全链路 miss 返回 null，UI 显示「未找到该条目的维基简介」。

### 5.4 行政区中文名后台解析

进入国家详情页且 ADM1 加载完成后，对所有未缓存中文名的地区以**并发 4** 逐个走 5.3 链路；每解析到一个就地更新列表项与 hover 标签。切换国家时中止未完成队列（令牌失效即可，无需 AbortController）。

### 5.5 缓存策略

| 内容 | 位置 | 键 | TTL |
|------|------|----|-----|
| 维基摘要 | localStorage | `wiki:<name>` | 7 天 |
| 地区中文名 | localStorage | 随摘要同存（取 `title` 字段） | 7 天 |
| ADM1 GeoJSON | 仅内存（Map by a3） | — | 页面生命周期 |
| 国界 TopoJSON | 仅内存 | — | 页面生命周期 |

localStorage 写入包 try/catch（隐私模式/配额超限时静默降级为纯内存）。

## 6. 路由与状态机

状态：`world` ↔ `country(id)` ↔ `region(id, idx)`。

- 用户操作（点击/返回按钮/面包屑）→ `location.hash = …`，统一由 `hashchange` 处理器驱动状态迁移与渲染（单一数据流，避免双路径不一致）。
- 直接打开 `#/c/156/r/3` 深链：依次加载世界→进入国家→选中地区（中间态显示加载骨架）。
- 非法 hash：未知国家 id → 重定向 `#/`；越界地区 index → 重定向 `#/c/<id>`（保留已加载的国家上下文，体验优于直接回首页；2026-06-11 实测后追认）。

## 7. 错误处理矩阵

| 故障 | 表现 |
|------|------|
| world-atlas 加载失败 | 全屏提示「世界地图加载失败」+ 重试按钮 |
| ADM1 加载失败 | 地图区提示「未能加载省级边界」+ 重试链接；右栏国家文章正常显示 |
| ADM1 无数据 | 地图区显示国家轮廓（来自 110m 国界），提示「该国暂无省级行政区数据」 |
| 维基 miss/失败 | 「未找到该条目的维基简介」+ 维基搜索外链 |
| 所有 fetch | try/catch 兜底，控制台无未捕获异常 |

## 8. 测试钩子与验收标准

暴露 `window.__app = { selectCountry(numericId), selectRegion(index), reset(), state() }`，与真实点击共用同一处理函数。

**验收（实施完成后用 workflow 逐项核验并出报告）**：
1. 抽样 ≥10 国走通「点国家→详情页→点地区→文章→逐级回退」，样本须含：中国、美国（跨经线）、俄罗斯（跨经线）、法国（海外领地）、塞浦路斯或卢森堡（110m 中实际存在的小国；原样本新加坡经实测**不在** 110m 数据中，已更正）、至少 1 个无 ADM1 数据国（如南极洲）、至少 1 个争议地区（如科索沃）。
2. 简介简体中文优先；无中文条目时英文兜底且不报错。
3. 浏览器返回键与面包屑回退一致；深链 `#/c/156/r/3` 直开可用。
4. 控制台无未捕获异常（favicon 404 除外）。
5. 断网模拟：各降级文案正确出现。
6. 窄屏（375px 宽）布局不破版。

## 9. 仓库结构

```
globe-explorer/
  index.html          # v1 正式版（本 spec 的实现物）
  mockups/            # 三方向评审原型（保留作参考，不再维护）
  docs/superpowers/specs/2026-06-11-globe-atlas-design.md
```
