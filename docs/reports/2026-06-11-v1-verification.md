# 寰宇地图册 v1 验收报告

日期：2026-06-11 ｜ 分支：`feat/v1` ｜ 结论：**验收通过**（核验发现的唯一功能缺失已当场修复并复验）

## 核验方法（三方证据）

1. **代码核验**（Workflow 并行 5 个只读 agent，每个负责一个 spec 章节）：78 条要求逐条对照 `index.html`，附行号证据。
2. **数据链路实测**（Workflow agent，curl）：world-atlas CDN / geoBoundaries meta+LFS 直链 / zh 维基 action API 简体输出 / en→Wikidata→zhwiki 桥接 / Wikidata SPARQL 再生成能力，5/5 通过。
3. **浏览器端到端验收**（主会话 playwright 驱动 `window.__app` 钩子）：12 国样本全流程 + 深链 + 返回键 + 断网模拟 + 窄屏。

## 核验结果总览

| 证据源 | 结果 |
|--------|------|
| 代码核验 78 条 | 76 implemented / 1 deviation / 1 missing（已修复） |
| 数据链路实测 5 项 | 5/5 通过 |
| 浏览器验收 | 全部通过，未捕获异常 0 |

## 浏览器验收明细

- **全流程样本**（点国家→详情页→点地区→文章→逐级回退）：中国（34 省，海南省/福建省/台湾省文章，全简体）、美国 56（本土取景，阿拉斯加仍绘制）、俄罗斯 83（全境无裁切）、法国 13（本土+科西嘉）、葡萄牙 20、巴西 27、澳大利亚 9、意大利 5（geoBoundaries 源数据口径即 5 个宏观区）、塞浦路斯 6、尼泊尔 7、科索沃（轮廓+中文名回填）、南极洲（「暂无省级数据」+轮廓）。
- **路由**：深链 `#/c/156/r/3` 直开福建省；`history.back()` 逐级回退；非法 `#/c/99999` 重定向 `#/`。
- **降级**：断网模拟下世界地图重试按钮恢复 177 国；ADM1 失败重试恢复巴西 27 州；维基全 miss 显示提示+「去维基百科搜索 →」外链。
- **中文化**：中国首次渐进解析 34/34（约 20s，4 并发）；复访缓存预填即时 34/34；localStorage `hy1:` 35 键。
- **异常**：`error`/`unhandledrejection` 探针全程为 0；控制台仅 favicon 404 与维基标题探测的 404 资源日志（预期行为）。
- **窄屏**：375px 国家页上下堆叠不破版。
- 验收截图：`screenshots/`（法国/美国修复前后/俄罗斯/375px）。

## 与 spec/计划的偏差（全部已处置）

| # | 偏差点 | spec 原要求 | 实际实现/实测 | 处置 |
|---|--------|------------|--------------|------|
| 1 | 越界地区 index 重定向 | 重定向 `#/` | 重定向 `#/c/<id>`（保留国家上下文，体验更好） | **修订 spec 追认** |
| 2 | 维基 miss 缺搜索外链 | miss 提示 + 维基搜索外链 | 实现时遗漏外链 | **已修复**（`fillWikiSlots` 增 `searchName` 参数），断网模拟复验通过 |
| 3 | 验收样本「新加坡」 | 110m 最小级国家样本 | 实测新加坡**不在** world-atlas 110m 数据中（仅 177 形状）；非法 id 被路由正确重定向 | spec 假设错误，**已更正**为塞浦路斯/卢森堡 |
| 4 | 争议地区 id「-99」 | 科索沃等共用 -99 | 实测 id 为 **undefined**；实现改为 init 分配合成负数 id（-1/-2/-3） | spec 假设错误，**已更正** |
| 5 | geoBoundaries 404 | 404 → nodata | 404 错误页无 CORS 头，fetch 直接抛异常拿不到状态码 | 实现按 `navigator.onLine` 判别（在线 nodata/离线 error），**spec 已补记** |
| 6 | LFS 指针表述 | 「github raw 形式返回 131B 指针」 | `github.com/.../raw/` 实为 302 到 media 直链；131B 指针来自 raw.githubusercontent/jsdelivr | 仅表述细节，**spec 已更正**；改写逻辑仍正确且省一跳 |
| 7 | 轻微差异 | 国家表「约 250 行」；错误文案措辞；缓存键格式未规定 | 262 行（覆盖更全）；文案多「请检查网络」；键加 `hy1:` 前缀 | 无害，不处置 |

**实现阶段新增（spec 未明文，属内容质量修正）**：①消歧义页过滤（en `type=disambiguation` / zh `pageprops.disambiguation`）；②候选名去连续重复词（源数据 "Ningxia Ningxia Hui…"→宁夏回族自治区）；③`REGION_OVERRIDES` 定向修正（Taiwan Province → 显示「台湾省」、条目改连「台湾」地理条目，避免通用链路错连政体条目）。

## 已知特性（非缺陷）

- 各国省级区划数量取决于 geoBoundaries gbOpen 口径（如意大利为 5 个宏观区而非 20 大区、法国仅 13 个本土大区）。
- COUNTRY_TABLE 中文名取自 Wikidata 标签，部分为正式名（「中华人民共和国」「大韩民国」）——对百科产品可接受，维基条目反而更对口。
- 地区中文名首次解析每条最多 3 个请求（en→Wikidata→zh），34 区约 20s；二次访问走缓存即时。

## 遗留事项（v1 不做，进 future 清单）

搜索、收藏、二级行政区、部署（GitHub Pages）、移动 App、维基简介预取。

## 实现产出

- `index.html`：约 1030 行单文件（含 262 行 COUNTRY_TABLE），CDN 依赖 d3@7 / topojson-client@3 / Noto Serif SC，无构建无 key。
- 运行：`python3 -m http.server 8743` → `http://localhost:8743/index.html`。
- 提交：`feat/v1` 分支 9 个 commit（6 实现 + 2 修复 + 文档）。
