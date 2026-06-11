# 寰宇地图册 v1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依据已批准 spec（`docs/superpowers/specs/2026-06-11-globe-atlas-design.md`）交付方向 B「地图册风」单文件 `index.html`：全球国家可点击下钻省级行政区，简介全实时维基（简体），hash 路由 + localStorage 缓存。

**Architecture:** 以已验证的 `mockups/mockup-b-atlas.html`（599 行）为基底派生 `index.html`，按 spec §4 差异表做 7 项产品化改造。数据链路（LFS 直链、rewind、维基简体链路）原样沿用 mockup 已验证实现。

**Tech Stack:** d3@7 + topojson-client@3（CDN）、Noto Serif SC、Wikipedia/Wikidata/geoBoundaries 公开 API。无构建、无测试框架——**验证方式为浏览器实测**（playwright 驱动 `window.__app` 测试钩子 + 截图目检），每个任务末尾给出确切的验证命令与预期结果。

**测试说明（替代 TDD 的理由）：** 单文件可抛弃实验、无 Node 工程，行为全部依赖浏览器渲染与外部 API；为其搭建单测框架违反 YAGNI 与用户「简洁优先」指令。每任务以「浏览器可观测行为断言」为验收，等价于端到端测试先行。

**前置条件：** 本地服务器已在跑（`python3 -m http.server 8742`，工作目录 `mockups/`）。本计划改在仓库根目录运行新实例：`cd /Users/lsh/dev/globe-explorer && python3 -m http.server 8743`，访问 `http://localhost:8743/index.html`。

---

### Task 1: 生成 COUNTRY_TABLE（ISO numeric → alpha-3 + 中文名）

**Files:**
- Create: `/Users/lsh/.claude/jobs/02f31b41/tmp/country-table.js`（中间产物，Task 2 内联后即弃）

- [ ] **Step 1.1: 跑 Wikidata SPARQL 并转成 JS 对象字面量**

```bash
cd /Users/lsh/.claude/jobs/02f31b41/tmp
curl -s -G 'https://query.wikidata.org/sparql' \
  -H 'Accept: application/sparql-results+json' \
  -H 'User-Agent: globe-explorer-dev/0.1 (contact: github.com/lshorace227-dotcom)' \
  --data-urlencode 'query=SELECT ?num ?a3 ?zh ?zhs WHERE { ?c wdt:P299 ?num ; wdt:P298 ?a3 . OPTIONAL { ?c rdfs:label ?zh . FILTER(LANG(?zh)="zh") } OPTIONAL { ?c rdfs:label ?zhs . FILTER(LANG(?zhs)="zh-hans") } }' \
  > sparql-raw.json
python3 - <<'EOF'
import json
d = json.load(open('sparql-raw.json'))
rows = {}
for b in d['results']['bindings']:
    try: num = int(b['num']['value'])
    except ValueError: continue
    a3 = b['a3']['value'].strip().upper()
    if len(a3) != 3 or not a3.isalpha(): continue
    zh = (b.get('zhs') or b.get('zh') or {}).get('value', '').strip()  # 优先 zh-hans
    cur = rows.get(num)
    if cur is None or (not cur[1] and zh):
        rows[num] = (a3, zh)
items = ',\n  '.join(
    f"{n}:{{a3:'{v[0]}',zh:'{v[1]}'}}" if v[1] else f"{n}:{{a3:'{v[0]}'}}"
    for n, v in sorted(rows.items()))
open('country-table.js','w').write(
    '/* 生成自 Wikidata SPARQL（P299/P298/中文标签），生成方式见 spec §5.1，2026-06-11 */\n'
    'const COUNTRY_TABLE = {\n  ' + items + '\n};\n')
print('rows:', len(rows))
EOF
```

预期：`rows:` ≥ 240。

- [ ] **Step 1.2: 抽查正确性 + world-atlas 覆盖率核对**

```bash
cd /Users/lsh/.claude/jobs/02f31b41/tmp
grep -o "156:{a3:'CHN',zh:'[^']*'}" country-table.js
grep -o "840:{a3:'USA',zh:'[^']*'}" country-table.js
grep -o "158:{a3:'TWN'[^}]*}" country-table.js
curl -s https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json > wa.json
python3 - <<'EOF'
import json, re
table = set(int(m) for m in re.findall(r'^\s*(\d+):', open('country-table.js').read(), re.M))
wa = json.load(open('wa.json'))
ids = [g.get('id') for g in wa['objects']['countries']['geometries']]
missing = sorted(set(int(i) for i in ids if i is not None and str(i).lstrip('-').isdigit() and int(i) > 0) - table)
print('world-atlas 形状数:', len(ids), '| 表内未覆盖的正数 id:', missing)
EOF
```

预期：`156:{a3:'CHN',zh:'中国'}`、`840:{a3:'USA',zh:'美国'}`、`158` 存在；未覆盖 id 列表为空或 ≤3 个（逐个确认是争议地区/属地后接受，记入最终报告）。

- [ ] **Step 1.3: 无需提交**（中间产物在 Task 2 内联进 index.html 后随之入库）

---

### Task 2: 派生 index.html——全球开放 + ADM1 降级

**Files:**
- Create: `index.html`（由 `mockups/mockup-b-atlas.html` 复制后改造）

- [ ] **Step 2.1: 复制基底**

```bash
cd /Users/lsh/dev/globe-explorer && cp mockups/mockup-b-atlas.html index.html
```

- [ ] **Step 2.2: 改标题/刊头/页脚（去 MOCKUP 字样）**

`<title>` 改为 `寰宇地图册 · ATLAS`；masthead-inner 文本改为 `寰 宇 地 图 册 · A T L A S`；`#globe-caption` 默认文案与 `DEFAULT_HINT` 不变；`#foot` 改为 `实验版 · 数据：Wikipedia / geoBoundaries / Natural Earth`。

- [ ] **Step 2.3: 用 COUNTRY_TABLE 替换 DEMO，删除侧卡片路径**

1. 删除 `const DEMO = {…}` 与 `const DEMO_LIST = …` 两个声明，在原位置插入 Task 1 生成的 `country-table.js` 全文：

```bash
python3 - <<'EOF'
import re
s = open('index.html').read()
table = open('/Users/lsh/.claude/jobs/02f31b41/tmp/country-table.js').read()
s = re.sub(r"const DEMO = \{.*?\};\nconst DEMO_LIST = '[^']*';", table.rstrip(), s, flags=re.S)
assert 'COUNTRY_TABLE' in s and 'const DEMO ' not in s
open('index.html','w').write(s)
EOF
```

2. 删除侧卡片：HTML 中 `<aside id="side-card"></aside>`、CSS 中 `/* ── 非演示国家：侧卡片 ── */` 至 `.hint{…}` 区块、JS 中 `showCard`/`closeCard` 两个函数、`cardToken`/`cardOpen` 变量、`const cardEl = …` 行、`document.addEventListener('click', …closeCard…)` 与 `cardEl.addEventListener('click', …)` 两行、测试钩子里的 `closeCard();`。

3. `handleCountryClick` 改为（路由在 Task 4 接管，本阶段直连）：

```js
function handleCountryClick(f){
  if (state.view !== 'globe' || !f) return;
  enterCountry(f);
}
```

4. 名称工具函数（插在 `esc` 之后）：

```js
/* 国家显示名：内置表 → 维基命中缓存 → 英文 */
function countryEntry(id){ return COUNTRY_TABLE[id] || null; }
function countryZh(id, f){
  const e = countryEntry(id);
  return (e && e.zh) || zhNameCache[id] || (f && f.properties && f.properties.name) || '未知地区';
}
```

5. `setGlobeCaption` 中 `(DEMO[id] && DEMO[id].zh) || zhNameCache[id] || …` 改为 `countryZh(id, d)`。

- [ ] **Step 2.4: fetchADM1 区分「无数据 / 失败」三态**

整个函数替换为：

```js
/* geoBoundaries ADM1：meta → LFS 媒体直链；返回 {status:'ok',features} | {status:'nodata'} | {status:'error'} */
async function fetchADM1(a3){
  if (!a3) return { status:'nodata' };
  try{
    const mr = await fetch('https://www.geoboundaries.org/api/current/gbOpen/'+a3+'/ADM1/');
    if (mr.status === 404) return { status:'nodata' };
    if (!mr.ok) return { status:'error' };
    let meta = await mr.json();
    if (Array.isArray(meta)) meta = meta[0];
    const src = meta && meta.simplifiedGeometryGeoJSON;
    if (!src) return { status:'nodata' };
    let gj = null;
    const m = src.match(/github\.com\/wmgeolab\/geoBoundaries\/raw\/([^/]+)\/(.+)$/);
    if (m){
      try{
        const r = await fetch('https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/'+m[1]+'/'+m[2]);
        if (r.ok) gj = await r.json();
      }catch(e){ /* 直链失败，退回原始 URL */ }
    }
    if (!gj){
      const r2 = await fetch(src);
      gj = r2.ok ? await r2.json() : null;
    }
    if (!gj) return { status:'error' };
    if (!Array.isArray(gj.features) || !gj.features.length) return { status:'nodata' };
    gj.features.forEach(rewindFeature);
    return { status:'ok', features: gj.features };
  }catch(e){ return { status:'error' }; }
}
```

- [ ] **Step 2.5: enterCountry 改造（任意国家 + 三态处理 + 重试）**

`enterCountry` 与新增函数整体替换/插入：

```js
async function enterCountry(f){
  const id = Number(f.id), entry = countryEntry(id);
  const my = ++paneToken;
  state.view = 'flying';
  state.countryId = id; state.regions = []; state.selected = -1;
  state.countryInfo = { zh: countryZh(id, f), en: (f.properties && f.properties.name) || (entry && entry.a3) || '', wiki: null, feature: f };
  document.getElementById('bc-country').textContent = state.countryInfo.zh;
  cSvg.selectAll('*').remove();
  mapLoading.textContent = '正在装载地图…'; mapLoading.style.display = 'block';
  regionCaption.textContent = '';
  renderCountryShell(); editPane.scrollTop = 0;
  const admP = loadCountryData(f, entry, my);            // 边界与简介并行拉取
  const animDone = new Promise(res=>flyTo(f, ()=>{
    if (my !== paneToken) return;                        // 飞行途中被 reset
    switchView('country', ()=>{ state.view = 'country'; res(); });
  }));
  wiki(state.countryInfo.zh !== state.countryInfo.en ? state.countryInfo.zh : state.countryInfo.en).then(w=>{
    if (my !== paneToken) return;
    state.countryInfo.wiki = w; fillWikiSlots(w);
    if (w && w.lang === 'zh' && w.title && !(entry && entry.zh)){   // 表内无中文名的（-99 等）回填
      zhNameCache[id] = w.title;
      state.countryInfo.zh = w.title;
      document.getElementById('bc-country').textContent = w.title;
      const t = editPane.querySelector('.c-title'); if (t) t.textContent = w.title;
    }
  });
  await animDone;
  await admP;
}

/* 数据装载（与动画解耦，便于「重试」不重放动画） */
async function loadCountryData(f, entry, my){
  const adm = await fetchADM1(entry && entry.a3);
  if (my !== paneToken) return;
  if (adm.status === 'ok'){
    adm.features.forEach((rf,i)=>{ rf.__i = i; });
    state.regions = adm.features;
    mapLoading.style.display = 'none';
    renderCountryMap({type:'FeatureCollection', features: adm.features}, entry && entry.a3);
    fillRegionList();
  } else if (adm.status === 'nodata'){
    mapLoading.style.display = 'none';
    renderCountryOutline(f);
    regionCaption.textContent = '该国暂无省级行政区数据';
    const slot = document.getElementById('slot-regions');
    if (slot) slot.innerHTML = '<p class="muted">该国暂无省级行政区数据</p>';
  } else {
    mapLoading.innerHTML = '未能加载省级边界 <a id="adm1-retry" style="cursor:pointer;text-decoration:underline">重试</a>';
    const slot = document.getElementById('slot-regions');
    if (slot) slot.innerHTML = '<p class="muted">未能加载行政区划数据</p>';
    const a = document.getElementById('adm1-retry');
    if (a) a.onclick = ()=>{
      mapLoading.textContent = '正在装载地图…';
      const slot2 = document.getElementById('slot-regions');
      if (slot2) slot2.innerHTML = '<div class="skel" style="width:42%"></div><div class="skel" style="width:72%"></div>';
      loadCountryData(f, entry, paneToken);
    };
  }
}

/* 无 ADM1 数据：画国家轮廓（来自 110m 国界） */
function renderCountryOutline(f){
  const pane = document.getElementById('map-pane');
  const w = Math.max(pane.clientWidth, 240), h = Math.max(pane.clientHeight, 240);
  cSvg.attr('width', w).attr('height', h).attr('viewBox', '0 0 '+w+' '+h);
  const cen = d3.geoCentroid(f);
  const proj = d3.geoMercator().rotate([-cen[0],0]);
  proj.fitExtent([[32,32],[w-32,h-32]], f);
  cSvg.selectAll('*').remove();
  cSvg.append('path').datum(f).attr('d', d3.geoPath(proj))
    .attr('class','region').style('fill', PAPER_FILLS[0]).style('cursor','default');
}
```

注意：原 `enterCountry` 内 `const admP = fetchADM1(demo.iso3);…const adm = await admP;…` 的 ADM1 处理代码块全部并入上面 `loadCountryData`，不要残留。

- [ ] **Step 2.6: resize 处理器改用 COUNTRY_TABLE**

```js
window.addEventListener('resize', ()=>{
  if (countries.length && state.view === 'globe') buildGlobe();
  if (state.view === 'country'){
    if (state.regions.length){
      const e = countryEntry(state.countryId);
      renderCountryMap({type:'FeatureCollection', features: state.regions}, e && e.a3);
    } else if (state.countryInfo && state.countryInfo.feature){
      renderCountryOutline(state.countryInfo.feature);
    }
  }
});
```

- [ ] **Step 2.7: 测试钩子改名 __app（含 state()）**

```js
/* 测试钩子：与真实点击走同一处理函数 */
window.__app = {
  selectCountry(numericId){ const f = countryById.get(Number(numericId)); if (f) handleCountryClick(f); },
  selectRegion(index){ if (state.regions.length) handleRegionClick(Number(index)); },
  reset(){ goGlobe(); },
  state(){ return { view: state.view, countryId: state.countryId, selected: state.selected, regions: state.regions.length }; }
};
```

- [ ] **Step 2.8: 浏览器验证**

启动 `python3 -m http.server 8743`（仓库根），playwright 打开 `http://localhost:8743/index.html`，依次 evaluate：

```js
// ① 葡萄牙（原非演示国）可进详情页
window.__app.selectCountry(620); /* 等待 ~6s */ window.__app.state()
// 预期 {view:'country', countryId:620, regions:>0}；标题「葡萄牙」
// ② 中国全流程
window.__app.reset(); window.__app.selectCountry(156); /* 等待 */ window.__app.selectRegion(0)
// 预期 地区文章出现「海南省」
// ③ 科索沃（-99，无表项）→ 轮廓降级
window.__app.reset(); /* 点击 Kosovo：countryById.get(-99) */ window.__app.selectCountry(-99); 
// 预期 详情页出现，地图为单一轮廓，文案「该国暂无省级行政区数据」，标题为维基中文名或英文名，无控制台未捕获异常
```

- [ ] **Step 2.9: Commit**

```bash
git add index.html && git commit -m "feat: index.html 基底——全球国家开放下钻 + ADM1 三态降级"
```

---

### Task 3: 详情页取景通用化（最大面积主体聚类）

**Files:**
- Modify: `index.html`（`renderCountryMap` 及新增 `fitFeatures`）

- [ ] **Step 3.1: 新增 fitFeatures + 改造 renderCountryMap**

在 `renderCountryMap` 前插入：

```js
/* 取景主体：以面积最大 feature 为种子，按质心距离 ≤0.32rad(≈18°) 做传递闭包聚类；
   远洋属地不参与取景但仍绘制（spec §4 差异 7） */
function fitFeatures(features){
  if (features.length <= 1) return {type:'FeatureCollection', features};
  let seed = 0, bestArea = -1;
  features.forEach((f,i)=>{ const a = d3.geoArea(f); if (a > bestArea){ bestArea = a; seed = i; } });
  const cents = features.map(f=>d3.geoCentroid(f));
  const keep = new Set([seed]);
  let grew = true;
  while (grew){
    grew = false;
    features.forEach((f,i)=>{
      if (keep.has(i)) return;
      for (const k of keep){
        if (d3.geoDistance(cents[i], cents[k]) <= 0.32){ keep.add(i); grew = true; break; }
      }
    });
  }
  return {type:'FeatureCollection', features: features.filter((f,i)=>keep.has(i))};
}
```

`renderCountryMap` 中删除 USA 专用 `fit` 过滤块，替换取景三行：

```js
  const fit = fitFeatures(fc.features);
  const cen = d3.geoCentroid(fit);
  let proj = (iso3==='RUS'||iso3==='USA'||iso3==='CAN')
    ? d3.geoConicEqualArea().rotate([-cen[0],0]).parallels([cen[1]-12, cen[1]+12])
    : d3.geoMercator().rotate([-cen[0],0]);
  proj.fitExtent([[32,32],[w-32,h-32]], fit);
```

（函数签名参数名 `iso3` 保留，传入值为 alpha-3。）

- [ ] **Step 3.2: 浏览器验证**

依次 `selectCountry(250)`（法国）、`selectCountry(840)`（美国）、`selectCountry(643)`（俄罗斯），截图目检：法国本土铺满地图（圭亚那等属地小图仍可见或在画面外）、美国本土取景（阿拉斯加/夏威夷不挤压本土）、俄罗斯全境完整不被裁切。

- [ ] **Step 3.3: Commit**

```bash
git add index.html && git commit -m "feat: 详情页取景通用化——最大面积主体聚类 fitExtent"
```

---

### Task 4: hash 路由（浏览器返回键 + 深链）

**Files:**
- Modify: `index.html`（导航层重构）

- [ ] **Step 4.1: 加路由层，点击处理改为只写 hash**

在「入口」区块前插入：

```js
/* ════════ 路由：一切导航统一由 hash 驱动（单一数据流） ════════ */
function parseHash(){
  const m = location.hash.match(/^#\/c\/(-?\d+)(?:\/r\/(\d+))?$/);
  if (!m) return { view:'globe' };
  return { view:'country', id:Number(m[1]), region: m[2] == null ? -1 : Number(m[2]) };
}
function nav(hash){
  if (location.hash === hash) route();
  else location.hash = hash;
}
let pendingRegion = -1;
async function route(){
  const t = parseHash();
  if (t.view === 'globe'){ goGlobe(); return; }
  const f = countryById.get(t.id);
  if (!f){ location.replace('#/'); return; }
  if (state.countryId !== t.id || state.view === 'globe'){
    pendingRegion = t.region;
    await enterCountry(f);
  } else if (t.region >= 0){
    if (t.region < state.regions.length) selectRegionNow(t.region);
    else if (state.regions.length) location.replace('#/c/'+t.id);
    else pendingRegion = t.region;     // ADM1 尚未就绪，待 loadCountryData 兑现
  } else if (state.selected !== -1){
    backToCountry();
  }
}
window.addEventListener('hashchange', route);
```

改三处点击入口：

```js
function handleCountryClick(f){
  if (state.view !== 'globe' || !f) return;
  nav('#/c/'+Number(f.id));
}
function handleRegionClick(i){
  if (state.countryId == null) return;
  nav('#/c/'+state.countryId+'/r/'+Number(i));
}
```

原 `handleRegionClick` 函数体改名为 `selectRegionNow(i)`（内容不变，仍含 swapPane/wiki/fillWikiSlots 逻辑）。

`backToCountry` 内 `document.getElementById('btn-back-country').addEventListener('click', backToCountry);`（位于 `renderRegionShell`）改为 `…addEventListener('click', ()=>nav('#/c/'+state.countryId));`。

`document.getElementById('btn-back').addEventListener('click', goGlobe);` 改为 `…addEventListener('click', ()=>nav('#/'));`。

- [ ] **Step 4.2: enterCountry/loadCountryData 兑现 pendingRegion**

`loadCountryData` 的 `status==='ok'` 分支末尾（`fillRegionList();` 之后）追加：

```js
    if (pendingRegion >= 0){
      const pr = pendingRegion; pendingRegion = -1;
      if (pr < state.regions.length) selectRegionNow(pr);
      else location.replace('#/c/'+state.countryId);
    }
```

`nodata`/`error` 分支开头各加一行 `pendingRegion = -1;`。

- [ ] **Step 4.3: goGlobe 幂等 + 入口深链**

`goGlobe` 开头已有 `if (state.view === 'globe') return;` 保留。`init()` 末尾 `buildGlobe();` 之后追加一行 `route();`（支持携带 hash 直开）。

测试钩子改为路由驱动：

```js
window.__app = {
  selectCountry(numericId){ nav('#/c/'+Number(numericId)); },
  selectRegion(index){ if (state.countryId != null) nav('#/c/'+state.countryId+'/r/'+Number(index)); },
  reset(){ nav('#/'); },
  state(){ return { view: state.view, countryId: state.countryId, selected: state.selected, regions: state.regions.length, hash: location.hash }; }
};
```

- [ ] **Step 4.4: 浏览器验证**

```js
// ① 正向：selectCountry(156) → hash 变 #/c/156；selectRegion(2) → #/c/156/r/2
// ② history.back() → 回到 #/c/156 且右栏回到国家文章；再 back() → 地球仪
// ③ 直开深链：navigate 到 http://localhost:8743/index.html#/c/156/r/3 → 加载后直达福建省文章
// ④ 非法：#/c/99999 → 被替换为 #/；#/c/156/r/999 → 被替换为 #/c/156
```

每步核对 `window.__app.state()` 与可见 DOM。

- [ ] **Step 4.5: Commit**

```bash
git add index.html && git commit -m "feat: hash 路由——浏览器返回键与深链支持"
```

---

### Task 5: localStorage 缓存 + 行政区中文名后台解析

**Files:**
- Modify: `index.html`（缓存层 + wiki 包装 + 解析队列）

- [ ] **Step 5.1: 缓存层 + wiki() 缓存包装**

在 `zhSummary` 之前插入：

```js
/* localStorage 缓存：7 天 TTL，隐私模式/超限静默降级（spec §5.5） */
const CACHE_TTL = 7*24*3600*1000;
function cacheGet(k){
  try{
    const r = JSON.parse(localStorage.getItem('hy1:'+k));
    if (r && Date.now() - r.t < CACHE_TTL) return r.v;
  }catch(e){}
  return undefined;
}
function cacheSet(k, v){
  try{ localStorage.setItem('hy1:'+k, JSON.stringify({ t: Date.now(), v: v })); }catch(e){}
}
```

`wiki(title)` 函数体首尾加缓存（只缓存命中，miss/网络失败不缓存）：

```js
async function wiki(title){
  if (!title) return null;
  const ck = 'wiki:'+title;
  const hit = cacheGet(ck);
  if (hit) return hit;
  let out = null;
  if (HAS_CJK_RE.test(String(title))){
    out = await zhSummary(title);
  } else {
    let en = await enSummary(title);
    if (!en){
      const stripped = String(title).replace(WIKI_SUFFIX_RE,'');
      if (stripped !== String(title)) en = await enSummary(stripped);
    }
    if (en && en.qid){
      const zt = await qidZhTitle(en.qid);
      if (zt){ const z = await zhSummary(zt); if (z) out = z; }
    }
    if (!out) out = en;
  }
  if (out) cacheSet(ck, out);
  return out;
}
```

- [ ] **Step 5.2: 地区中文名——缓存预填 + 后台并发解析**

`loadCountryData` 的 `status==='ok'` 分支，在 `adm.features.forEach((rf,i)=>{ rf.__i = i; });` 之后插入：

```js
    adm.features.forEach(rf=>{                       // 缓存预填中文名
      const n = rf.properties && rf.properties.shapeName;
      const c = n && cacheGet('wiki:'+n);
      if (c && c.lang === 'zh' && c.title) rf.__zh = c.title;
    });
```

`fillRegionList();` 之后（pendingRegion 块之前）插入一行 `resolveRegionNames();`，并新增函数：

```js
/* 后台解析地区中文名：并发 4，token 失效即停（spec §5.4） */
async function resolveRegionNames(){
  const my = paneToken;
  const tasks = state.regions.map((f,i)=>({f,i})).filter(({f})=>!f.__zh && f.properties && f.properties.shapeName);
  let cursor = 0;
  async function worker(){
    while (cursor < tasks.length){
      const {f,i} = tasks[cursor++];
      const name = f.properties.shapeName;
      const w = regionWikiCache.has(name) ? regionWikiCache.get(name) : await wiki(name);
      if (my !== paneToken) return;
      regionWikiCache.set(name, w);
      if (w && w.lang === 'zh' && w.title){
        f.__zh = w.title;
        const li = document.getElementById('ri-'+i);
        if (li) li.innerHTML = '<span class="ri-no">'+String(i+1).padStart(2,'0')+'</span>'+esc(w.title);
        if (state.selected === i){
          const t = document.getElementById('r-title'); if (t) t.textContent = w.title;
        }
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
}
```

- [ ] **Step 5.3: 显示处统一用 `__zh || shapeName`**

三处替换：
1. `fillRegionList` 列表项文本：`esc(f.__zh || (f.properties && f.properties.shapeName) || '—')`
2. `hoverRegion` 底部斜体：`regionCaption.textContent = (on && f) ? (f.__zh || (f.properties && f.properties.shapeName) || '') : '';`
3. `selectRegionNow` 内 `const name = …` 改为 `const name = f.__zh || (f.properties && f.properties.shapeName) || '未命名地区';`（维基查询键保持 shapeName：紧随其后的 wiki 调用参数改为 `f.properties.shapeName || name`）。

- [ ] **Step 5.4: 浏览器验证**

```js
// ① 首次进中国：列表初始英文，~10s 内逐项变中文（北京市/广东省…）
// ② localStorage 含 hy1:wiki:Hainan Province 等键
// ③ reset 后再进中国：列表「秒出」即为中文（缓存预填）
// ④ 解析中途 reset()（token 失效）：控制台无错误，地球仪正常
```

- [ ] **Step 5.5: Commit**

```bash
git add index.html && git commit -m "feat: localStorage 缓存 + 行政区中文名后台并发解析"
```

---

### Task 6: 错误矩阵补全 + 响应式 + README

**Files:**
- Modify: `index.html`
- Create: `README.md`（仓库根）

- [ ] **Step 6.1: world-atlas 失败重试**

`init` 改为具名可重入：

```js
async function init(){
  try{
    globeCaption.textContent = '正在加载世界地图…'; globeCaption.classList.add('active');
    const r = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    if (!r.ok) throw new Error('http '+r.status);
    const topo = await r.json();
    countries = topojson.feature(topo, topo.objects.countries).features;
    countries.forEach(f=>{ const n = Number(f.id); if (!Number.isNaN(n)) countryById.set(n, f); });
    globeCaption.classList.remove('active'); globeCaption.textContent = DEFAULT_HINT;
    buildGlobe();
    route();
  }catch(e){
    globeCaption.innerHTML = '世界地图加载失败，请检查网络 <button id="btn-retry-world" class="text-btn" style="text-decoration:underline">重试</button>';
    globeCaption.classList.add('active');
    document.getElementById('btn-retry-world').onclick = init;
  }
}
init();
```

（替换原 IIFE。）

- [ ] **Step 6.2: 响应式（<900px 上下堆叠）**

CSS 末尾追加：

```css
  /* ── 窄屏：详情页上下堆叠（spec §3） ── */
  @media (max-width: 900px){
    .country-body{ flex-direction:column; overflow-y:auto; }
    #map-pane{ width:100%; height:46vh; flex:none; }
    #edit-pane{ width:100%; border-left:none; border-top:1px solid var(--rule); padding:26px 22px 48px; }
    .c-title{ font-size:38px; }
    .c-title.r-size{ font-size:30px; }
  }
```

- [ ] **Step 6.3: 仓库 README**

```markdown
# 寰宇地图册（globe-explorer）

交互式地理百科实验：3D 地球仪 → 点国家翻开图册 → 点省/州读简介。单文件、无构建、无 API key，数据实时来自 Wikipedia / Wikidata / geoBoundaries / Natural Earth。

## 运行

​```bash
cd "/Users/lsh/dev/globe-explorer" && python3 -m http.server 8743
# 打开 http://localhost:8743/index.html
​```

- `index.html` — 正式版（spec：docs/superpowers/specs/）
- `mockups/` — 三方向评审原型（A 深空 / B 地图册 / C 应用卡片）

实验项目，可能随时整体删除。
```

（写入时去掉代码块前的零宽转义。）

- [ ] **Step 6.4: 浏览器验证**

① playwright `browser_resize(375, 740)` 进中国详情页 → 上下堆叠不破版；恢复 1440×900。② DevTools offline 模拟可由最终人工验收做，此处验证重试按钮路径：临时把 init 内 URL 改错→出现重试按钮→改回（仅本地验证，不提交错 URL）。

- [ ] **Step 6.5: Commit**

```bash
git add index.html README.md && git commit -m "feat: 错误重试 + 窄屏响应式 + README"
```

---

### Task 7: 全流程 sanity 验收

- [ ] **Step 7.1: 按 spec §8 验收标准跑核心抽样**（playwright，逐项记录结果，供 Task 8 工作流复核）：中国/美国/俄罗斯/法国/新加坡/科索沃 + 控制台错误清点 + 深链 + 返回键。
- [ ] **Step 7.2: 发现问题→修复→重验→commit**（修复提交信息 `fix: <问题>`)。

---

### Task 8: Workflow 核验 + 实施报告（用户明确要求）

- [ ] **Step 8.1:** 调用 Workflow 工具：阶段一并行派 read-only 核验 agent——逐条对照 spec §3/§4/§5/§6/§7（每 agent 负责一个 spec 章节，读 index.html 与 spec 比对，输出 schema 化结论：实现了/偏差/缺失 + 行号证据）；阶段二数据链路核验 agent（curl 实测 LFS 直链、SPARQL、维基 action API）；阶段三汇总。浏览器行为类验收（spec §8）由主会话在 Task 7 完成，结果作为输入交给汇总 agent。
- [ ] **Step 8.2:** 汇总输出写 `docs/reports/2026-06-11-v1-verification.md`：实现清单、与 spec/计划的全部偏差及原因、遗留事项。
- [ ] **Step 8.3:** Commit 报告并向用户汇报。

---

## 计划自检记录

- **Spec 覆盖**：§2 流程（Task 2/4）、§3 范围全项（Task 2/4/5/6）、§4 差异表 1-7（Task 1/2/3/4/5/6 一一对应）、§5 数据层（Task 1/2/5）、§6 路由（Task 4）、§7 错误矩阵（Task 2/6）、§8 验收（Task 7/8）——无缺口。
- **占位符**：无 TBD/「适当处理」类表述；所有代码步骤含完整代码。
- **类型一致性**：`fetchADM1` 返回 `{status, features}` 与 `loadCountryData` 消费一致；`selectRegionNow`/`handleRegionClick` 命名在 Task 4/5 一致；`countryEntry/countryZh` 全局唯一。
