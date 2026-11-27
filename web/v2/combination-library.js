(function (global) {
  'use strict';

  const C = global.AdopConfig, M = global.AdopModules;
  // Existing curated IDs keep their original five-colour assignment when
  // new customer finishes are added. New editorial samples append below.
  const editorialFinishes = ['oak', 'dark-oak', 'black-oak', 'cream', 'olive'];
  if (!C || !M) throw new Error('ADØP modül verileri kitaplıktan önce yüklenmeli.');

  // A bounded selection of actual product sequences, rather than small changes
  // to the same top offset. The order, IDs and material pairs are deterministic.
  const baseIds = [
    'bb-45-plain', 'bb-60-plain', 'bb-90-drop', 'bb-120-drop',
    'bb-45-open', 'bb-60-drawers', 'bb-90-drawers', 'bb-120-hybrid',
    'bb-90-deep-drawer', 'bb-120-deep-drawer'
  ];
  const productsById = new Map(M.products.map(function (p) { return [p.id, p]; }));
  const baseProducts = baseIds.map(function (id) {
    const product = productsById.get(id);
    if (!product) throw new Error('Kitaplık ürünü bulunamadı: ' + id);
    return product;
  });
  const quotas = [10, 90, 120, 120, 80, 60, 40];
  const palettePairs = [
    [['oak', 'oak', 'oak'], ['dark-oak', 'dark-oak', 'dark-oak']],
    [['oak', 'cream', 'oak'], ['dark-oak', 'olive', 'dark-oak']],
    [['cream', 'oak', 'cream'], ['olive', 'dark-oak', 'olive']],
    [['olive', 'oak', 'olive'], ['cream', 'dark-oak', 'cream']],
    [['oak', 'olive', 'oak'], ['dark-oak', 'cream', 'dark-oak']],
    [['cream', 'cream', 'cream'], ['olive', 'olive', 'olive']],
    [['oak', 'cream', 'oak'], ['dark-oak', 'olive', 'dark-oak']],
    [['cream', 'olive', 'cream'], ['olive', 'cream', 'olive']],
    [['black-oak', 'black-oak', 'black-oak'], ['cream', 'black-oak', 'cream']],
    [['black-oak', 'olive', 'black-oak'], ['cream', 'black-oak', 'cream']],
    [['olive', 'black-oak', 'olive'], ['black-oak', 'cream', 'black-oak']]
  ];
  const mechanicalCache = new Map(), geometries = new Map(), layouts = new Map(), fitContexts = new Map();
  const LAYOUT_CACHE_LIMIT = 96, FIT_CONTEXT_LIMIT = 6, EPSILON = 1e-7;
  let generated = null, statistics = null, layoutBuilds = 0;
  const now = function () { return global.performance && global.performance.now ? global.performance.now() : Date.now(); };
  const rounded = function (value) { return Math.round(value * 1000) / 1000; };
  const fmt = function (value) { return value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }); };

  function rank(code, length) {
    let value = code ^ Math.imul(length, 0x9e3779b1);
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0;
  }

  function sequences() {
    const result = [];
    for (let length = 1; length <= 5; length++) {
      const candidates = [], limit = Math.pow(baseProducts.length, length);
      for (let code = 0; code < limit; code++) {
        let remainder = code, width = 0, openCount = 0, hybridCount = 0, previousOpen = false, valid = true;
        const indices = [];
        for (let position = 0; position < length; position++) {
          const index = remainder % baseProducts.length;
          remainder = Math.floor(remainder / baseProducts.length);
          const product = baseProducts[index], open = product.front === 'open';
          width += product.width;
          if (open) { openCount++; if (previousOpen) valid = false; }
          if (product.front === 'hybrid') hybridCount++;
          previousOpen = open;
          indices.push(index);
        }
        if (!valid || width > 420 || openCount > (length <= 3 ? 1 : 2) || hybridCount > 2) continue;
        candidates.push({ indices: indices, width: width, code: code, rank: rank(code, length) });
      }
      candidates.sort(function (a, b) { return a.rank - b.rank || a.code - b.code; });
      result.push.apply(result, candidates.slice(0, quotas[length - 1]));
    }
    // Wider layouts are appended after the original 420 sequences. A bounded
    // deterministic sample avoids enumerating 10^6 / 10^7 combinations and
    // preserves every previously shared library ID and SKU.
    for (let length = 6; length <= 7; length++) {
      const candidates = [], visited = new Set(), limit = Math.pow(baseProducts.length, length);
      for (let sample = 0; sample < 12000; sample++) {
        const code = rank(sample, length + 13) % limit;
        if (visited.has(code)) continue;
        visited.add(code);
        let remainder = code, width = 0, openCount = 0, hybridCount = 0, previousOpen = false, valid = true;
        const indices = [];
        for (let position = 0; position < length; position++) {
          const index = remainder % baseProducts.length;
          remainder = Math.floor(remainder / baseProducts.length);
          const product = baseProducts[index], open = product.front === 'open';
          width += product.width;
          if (open) { openCount++; if (previousOpen) valid = false; }
          if (product.front === 'hybrid') hybridCount++;
          previousOpen = open;
          indices.push(index);
        }
        if (!valid || width > 540 || openCount > 2 || hybridCount > 2) continue;
        candidates.push({ indices: indices, width: width, code: code, rank: rank(code, length) });
      }
      candidates.sort(function (a, b) { return a.rank - b.rank || a.code - b.code; });
      if (candidates.length < quotas[length - 1]) throw new Error('Geniş yerleşim örnekleri eksik.');
      result.push.apply(result, candidates.slice(0, quotas[length - 1]));
    }
    return result;
  }

  function mechanical(modules, span) {
    const key = modules.map(function (m) { return m.width; }).join(',') + '|' + span;
    if (mechanicalCache.has(key)) return mechanicalCache.get(key);
    const offsets = C.allowedOffsets({ span: span, modules: modules, upper: [] });
    if (!offsets.length) throw new Error('Tabla için geçerli yerleşim bulunamadı: ' + key);
    const baseWidth = modules[modules.length - 1].x + modules[modules.length - 1].width;
    const target = baseWidth + 55 - span;
    const offset = offsets.reduce(function (nearest, value) {
      return Math.abs(value - target) < Math.abs(nearest - target) ? value : nearest;
    }, offsets[0]);
    const result = { offsets: offsets, offset: offset, minOffset: offsets[0], maxOffset: offsets[offsets.length - 1] };
    mechanicalCache.set(key, result);
    return result;
  }

  function upperPattern(pattern, width, pairedLeft) {
    const upper = [], primary = pairedLeft ? 'left' : 'right', opposite = pairedLeft ? 'right' : 'left';
    function wall(front, side, inset, y) {
      const w = front === 'vertical' ? 36 : front === 'hybrid' ? 120 : front === 'open' ? 45 : 60;
      upper.push({ type: 'UW', width: w, front: front, anchor: side, edgeOffset: inset || 0, x: side === 'right' ? width - w - (inset || 0) : inset || 0, y: y === undefined ? 144 : y });
    }
    function shelf(w, side, y) {
      if (w) upper.push({ type: 'WS', width: w, front: 'open', anchor: side, edgeOffset: 0, x: side === 'right' ? width - w : 0, y: y === undefined ? 177.2 : y });
    }
    function shelfFor(space) { return [120, 90, 60].find(function (value) { return value <= space; }); }
    function single() { wall(width >= 60 ? 'drop' : 'open', primary); }
    function tower(side) {
      wall('vertical', side, 0, 90);
      shelf(shelfFor(width - 48), side === 'left' ? 'right' : 'left');
    }
    if (pattern === 1) {
      if (width < 120) single();
      else {
        const count = width >= 192 ? 3 : 2;
        wall('drop', 'left', 0, 144);
        if (count === 3) wall('drop', 'left', 60, 144);
        wall('drop', 'right', 0, 144);
      }
    }
    if (pattern === 2) {
      if (width < 105) single();
      else { wall('drop', 'left'); wall('open', 'left', 60); shelf(shelfFor(width - 117), 'right'); }
    }
    if (pattern === 3) tower('left');
    if (pattern === 4) tower('right');
    if (pattern === 5) {
      if (width < 120) single();
      else { wall('hybrid', primary, 0, 162); shelf(shelfFor(width - 132), opposite); }
    }
    if (pattern === 6) {
      const w = shelfFor(width);
      if (!w) single();
      else {
        // A narrow side column of three or four shelves. Its x lane is kept
        // free of wall boxes; shelves may repeat vertically in this lane.
        const count = pairedLeft ? 3 : 4;
        for (let i = 0; i < count; i++) shelf(w, primary, 96 + i * 26);
      }
    }
    if (pattern === 7) {
      if (width < 156) tower(primary);
      else {
        wall('vertical', primary, 0, 90); wall('vertical', primary, 36, 90);
        shelf(shelfFor(width - 96), opposite);
      }
    }
    if (pattern === 8) {
      if (width < 168) tower('left');
      else { wall('vertical', 'left', 0, 90); wall('hybrid', 'right', 0, 162); }
    }
    if (pattern === 9) {
      if (width < 60) single();
      else { wall('drop', 'left', 0, 100); wall('drop', 'left', 0, 148); shelf(shelfFor(width - 72), 'right', 181.2); }
    }
    if (pattern === 10) {
      if (width < 105) single();
      else { wall('open', 'right'); wall('drop', 'right', 45); shelf(shelfFor(width - 117), 'left'); }
    }
    if (pattern === 11) {
      wall('open', 'right', 0, 100); wall('open', 'right', 0, 148); shelf(shelfFor(width - 57), 'left', 181.2);
    }
    if (pattern === 12) {
      if (width < 168) tower('right');
      else { wall('hybrid', 'left', 0, 162); wall('vertical', 'right', 0, 90); }
    }
    if (pattern === 13) {
      if (width < 120) single();
      else {
        wall('drop', primary, 0, 144);
        const w = shelfFor(width - 72);
        if (w) for (let i = 0; i < 3; i++) shelf(w, opposite, 125.2 + i * 26);
        else wall('drop', opposite, 0, 144);
      }
    }
    return C.resolveUpper(upper, width);
  }

  function heightKey(config) {
    const height = C.normalizeBodyHeight(config.bodyHeight);
    return height === 40 ? '' : '|height:' + height;
  }

  function geometryKey(config) {
    return config.modules.map(function (m) { return m.width + ':' + m.front + ':' + m.x; }).join('/') +
      '|' + (config.spanEnabled ? config.span + ':' + config.spanOffset : 'none') +
      '|' + config.upper.map(function (u) { return [u.type, u.width, u.front, u.anchor || 'free', u.edgeOffset || 0, u.anchor ? 0 : u.x, u.y].join(':'); }).join('/') + heightKey(config);
  }

  function physicalKey(config) {
    const frontVisible = config.modules.some(function (m) { return m.front !== 'open'; }) ||
      config.upper.some(function (u) { return u.type === 'UW' && u.front !== 'open'; });
    return geometryKey(config) + '|' + config.bodyFinish + '|' + (frontVisible ? config.frontFinish : '') +
      '|' + (config.spanEnabled ? config.spanFinish : '');
  }

  function hasOpaqueFront(config) {
    return config.modules.some(function (m) { return !['open', 'fluted-glass'].includes(m.front); }) ||
      config.upper.some(function (u) { return u.type === 'UW' && !['open', 'fluted-glass', 'vertical-glass'].includes(u.front); });
  }

  function isMonochrome(item) {
    const config = item.config || item;
    return (!config.spanEnabled || config.bodyFinish === config.spanFinish) &&
      (!hasOpaqueFront(config) || config.bodyFinish === config.frontFinish);
  }

  function hasGlass(item) {
    const config = item.config || item;
    return config.modules.some(function (module) { return module.front === 'fluted-glass'; }) ||
      config.upper.some(function (module) { return module.type === 'UW' && ['fluted-glass', 'vertical-glass'].includes(module.front); });
  }

  function isCuratedPalette(item) {
    const config = item.config || item, finishes = [config.bodyFinish, config.frontFinish, config.spanEnabled ? config.spanFinish : null];
    return !(finishes.includes('black-oak') && finishes.includes('olive'));
  }

  function visiblePhysicalKey(config) {
    return geometryKey(config) + '|' + config.bodyFinish + '|' + (hasOpaqueFront(config) ? config.frontFinish : '') +
      '|' + (config.spanEnabled ? config.spanFinish : '');
  }

  // Preserve every established design and shared ID. Add a bounded selection
  // of genuine one-finish variants after those entries, reusing their geometry,
  // mechanical bounds and lazy layout cache. Sample the whole geometry range
  // so single-colour choices are available beyond the first compact layouts.
  function appendMonochromeVariants(result, originals, seen) {
    const established = originals.concat(result), curated = established.filter(isCuratedPalette);
    const monochrome = curated.filter(isMonochrome), twoToneCount = curated.length - monochrome.length;
    const required = Math.max(0, twoToneCount - monochrome.length), visibleSeen = new Set(established.map(function (item) { return visiblePhysicalKey(item.config); }));
    const finishes = editorialFinishes.slice(), counts = new Map(finishes.map(function (finish) { return [finish, 0]; }));
    monochrome.forEach(function (item) { counts.set(item.config.bodyFinish, counts.get(item.config.bodyFinish) + 1); });
    const sources = new Map();
    result.forEach(function (item, index) {
      if (!isCuratedPalette(item)) return;
      if (!sources.has(item.geometryKey)) sources.set(item.geometryKey, { item: item, index: index, bodyFinishes: new Set() });
      if (!isMonochrome(item)) sources.get(item.geometryKey).bodyFinishes.add(item.config.bodyFinish);
    });
    const pools = finishes.map(function (finish, finishIndex) {
      const candidates = [];
      sources.forEach(function (source) {
        const config = { ...source.item.config, bodyFinish: finish, frontFinish: finish, spanFinish: finish };
        const signature = physicalKey(config), visibleSignature = visiblePhysicalKey(config);
        if (!seen.has(signature) && !visibleSeen.has(visibleSignature)) candidates.push({
          source: source.item, finish: finish, signature: signature, visibleSignature: visibleSignature,
          preferred: source.bodyFinishes.has(finish), rank: rank(source.index + 1, finishIndex + 41)
        });
      });
      candidates.sort(function (a, b) { return Number(b.preferred) - Number(a.preferred) || a.rank - b.rank || a.source.id.localeCompare(b.source.id); });
      return { finish: finish, candidates: candidates, cursor: 0 };
    });
    let added = 0;
    while (added < required) {
      const available = pools.filter(function (pool) { return pool.cursor < pool.candidates.length; });
      if (!available.length) throw new Error('Tek renkli yerleşim seçkisi için yeterli geometri bulunamadı.');
      available.sort(function (a, b) { return counts.get(a.finish) - counts.get(b.finish) || finishes.indexOf(a.finish) - finishes.indexOf(b.finish); });
      const pool = available[0], candidate = pool.candidates[pool.cursor++], source = candidate.source;
      const config = C.clean({ ...source.config, bodyFinish: candidate.finish, frontFinish: candidate.finish, spanFinish: candidate.finish });
      if (seen.has(candidate.signature) || visibleSeen.has(candidate.visibleSignature)) continue;
      seen.add(candidate.signature); visibleSeen.add(candidate.visibleSignature);
      const item = {};
      Object.keys(source).forEach(function (key) { if (key !== 'layout') item[key] = source[key]; });
      const finish = M.finishes.find(function (entry) { return entry.id === candidate.finish; });
      Object.assign(item, {
        id: 'library-mono-' + source.id.replace(/^library-/, '') + '-' + candidate.finish,
        combinationSku: 'KMB-MN-' + source.combinationSku.replace(/^KMB-LG-/, '') + '-' + finish.code,
        monochromeVariant: true,
        finish: candidate.finish, bodyFinish: candidate.finish, frontFinish: candidate.finish, spanFinish: candidate.finish,
        config: config, upper: config.upper,
        price: totalPrice(productList(config), config)
      });
      result.push(addLazyLayout(item, source.geometryKey, config));
      counts.set(candidate.finish, counts.get(candidate.finish) + 1);
      added++;
    }
    return { added: added, monochromeCount: monochrome.length + added, twoToneCount: twoToneCount };
  }

  // Long compositions use a bounded set of measured product rows. They are
  // appended only after the established catalogue and monochrome selection so
  // saved IDs, material samples and their order remain stable.
  function wideSequences() {
    const widths = [45, 60, 90, 120], memo = new Map(), used = new Set(), result = [];
    function possible(total, count) {
      if (!count) return total === 0;
      if (total < count * 45 || total > count * 120) return false;
      const key = total + ':' + count;
      if (memo.has(key)) return memo.get(key);
      const answer = widths.some(function (width) { return possible(total - width, count - 1); });
      memo.set(key, answer); return answer;
    }
    const fronts = { 45: ['plain', 'open', 'fluted-glass'], 60: ['plain', 'drawers', 'fluted-glass'], 90: ['drop', 'drawers', 'deep-drawer'], 120: ['drop', 'hybrid', 'deep-drawer'] };
    for (let total = 390; total <= 900; total += 30) {
      const lengths = [6, 7, 8, 9, 10].filter(function (count) { return possible(total, count); });
      for (let variant = 0; variant < 7; variant++) {
        let selected = null;
        for (let attempt = 0; attempt < 80 && !selected; attempt++) {
          const count = lengths[(variant + attempt) % lengths.length], seed = total * 31 + variant * 83 + attempt * 137;
          const row = []; let remaining = total, openCount = 0, glassCount = 0, hybridCount = 0;
          for (let position = 0; position < count; position++) {
            const choices = widths.filter(function (width) { return possible(remaining - width, count - position - 1); });
            choices.sort(function (a, b) { return rank(seed + position * 13 + a, variant + 71) - rank(seed + position * 13 + b, variant + 71); });
            const width = choices[0], options = fronts[width];
            let front = options[(variant + position + attempt) % options.length];
            if (front === 'open' && (openCount >= 2 || row.length && row[row.length - 1].front === 'open')) front = 'plain';
            if (front === 'fluted-glass' && glassCount >= 2) front = width === 45 ? 'plain' : 'drawers';
            if (front === 'hybrid' && hybridCount >= 2) front = 'drop';
            if (front === 'open') openCount++;
            if (front === 'fluted-glass') glassCount++;
            if (front === 'hybrid') hybridCount++;
            row.push({ width: width, front: front }); remaining -= width;
          }
          // At least one opaque front makes both material variants visibly
          // distinct, even in a predominantly open or glazed composition.
          if (!row.some(function (module) { return !['open', 'fluted-glass'].includes(module.front); })) row[0].front = row[0].width <= 60 ? 'plain' : 'drop';
          const signature = row.map(function (module) { return module.width + ':' + module.front; }).join('/');
          if (!used.has(signature)) { used.add(signature); selected = row; }
        }
        if (!selected) throw new Error('Geniş ürün sıralaması oluşturulamadı: ' + total + '/' + variant);
        result.push({ modules: selected, storageWidth: total });
      }
    }
    return result;
  }

  function wideUpperPattern(pattern, width, pairedLeft) {
    const upper = [], primary = pairedLeft ? 'left' : 'right', opposite = pairedLeft ? 'right' : 'left';
    function wall(front, side, inset) {
      const w = ['vertical', 'vertical-glass'].includes(front) ? 36 : front === 'hybrid' ? 120 : front === 'open' ? 45 : 60;
      upper.push({ type: 'UW', width: w, front: front, anchor: side, edgeOffset: inset || 0, x: 0, y: ['vertical', 'vertical-glass'].includes(front) ? 90 : front === 'hybrid' ? 162 : 144 });
    }
    function shelves(side, count, w) {
      for (let i = 0; i < count; i++) upper.push({ type: 'WS', width: w, front: 'open', anchor: side, edgeOffset: 0, x: 0, y: 100 + i * 26 });
    }
    // Edge groups share x lanes only with their own shelves. A clear middle
    // remains for the television; no shelf is stacked over a wall box.
    if (pattern === 1) { wall('vertical', primary); wall('vertical', primary, 36); wall('hybrid', opposite); }
    if (pattern === 2) { wall('vertical-glass', primary); shelves(opposite, 3, 120); }
    if (pattern === 3) { wall('drop', 'left'); wall('drop', 'left', 60); wall('open', 'right'); wall('drop', 'right', 45); }
    if (pattern === 4) { shelves(primary, 3, 90); wall('vertical', opposite); wall('vertical-glass', opposite, 36); }
    if (pattern === 5) { wall('hybrid', 'left'); wall('hybrid', 'right'); }
    if (pattern === 6) { wall('fluted-glass', primary); wall('open', primary, 60); shelves(opposite, 1, 120); }
    if (pattern === 7) { shelves(primary, 4, 120); wall('hybrid', opposite); }
    if (pattern === 8) { wall('drop', primary); wall('vertical', opposite); wall('vertical', opposite, 36); }
    return C.resolveUpper(upper, width);
  }

  function appendWideVariants(result, originals, seen) {
    const rows = wideSequences(), visibleSeen = new Set(originals.concat(result).map(function (item) { return visiblePhysicalKey(item.config); }));
    const finishes = editorialFinishes.slice();
    const accents = { oak: ['cream', 'olive'], 'dark-oak': ['cream', 'olive'], 'black-oak': ['cream'], cream: ['oak', 'dark-oak', 'olive', 'black-oak'], olive: ['oak', 'dark-oak', 'cream'] };
    let count = 0, monochromeCount = 0, twoToneCount = 0, skipped = 0;
    rows.forEach(function (row, rowIndex) {
      let end = 0;
      const modules = row.modules.map(function (module) { const value = { width: module.width, front: module.front, x: end }; end += module.width; return value; });
      [0, 120, 180].forEach(function (span, spanIndex) {
        const enabled = span > 0, mechanics = enabled ? mechanical(modules, span) : null;
        const eligibleOffsets = enabled ? mechanics.offsets.filter(function (value) { return value + span <= 900 + EPSILON; }) : null;
        if (enabled && !eligibleOffsets.length) return;
        const preferred = Math.min(end + 55, 900) - span;
        const offset = enabled ? eligibleOffsets.reduce(function (nearest, value) { return Math.abs(value - preferred) < Math.abs(nearest - preferred) ? value : nearest; }, eligibleOffsets[0]) : 0;
        const width = enabled ? Math.max(end, offset + span) : end;
        const minimumGround = enabled ? Math.max(end, mechanics.minOffset + span) : end;
        const upper = wideUpperPattern((rowIndex + spanIndex * 3) % 9, minimumGround, rowIndex % 2 === 0);
        const baseConfig = C.clean({ modules: modules, spanEnabled: enabled, span: span || 180, spanOffset: offset, upper: C.resolveUpper(upper, width) });
        const key = geometryKey(baseConfig), products = productList(baseConfig), upperWidth = Math.max(0, ...baseConfig.upper.map(function (entry) { return entry.x + entry.width; }));
        const fixedWidth = Math.max(end, C.upperBounds(baseConfig.upper).minWidth);
        const bounds = {
          baseStorageWidth: end, storageWidth: end, upperWidth: upperWidth, fixedWidth: fixedWidth,
          min: enabled ? Math.max(fixedWidth, mechanics.minOffset + span) : fixedWidth,
          max: enabled ? Math.max(fixedWidth, mechanics.maxOffset + span) : fixedWidth,
          spanEnabled: enabled, valid: true, minOffset: enabled ? mechanics.minOffset : null, maxOffset: enabled ? mechanics.maxOffset : null
        };
        bounds.minWidth = bounds.min; bounds.maxWidth = bounds.max;
        geometries.set(key, { mechanics: mechanics, bounds: bounds });
        const body = finishes[(rowIndex + spanIndex) % finishes.length], accentPool = accents[body];
        const pair = [[body, body, body], [body, accentPool[(Math.floor(rowIndex / finishes.length) + spanIndex) % accentPool.length], body]];
        pair.forEach(function (palette, materialIndex) {
          const config = C.clean({ ...baseConfig, bodyFinish: palette[0], frontFinish: palette[1], spanFinish: palette[2] });
          const signature = physicalKey(config), visibleSignature = visiblePhysicalKey(config);
          if (seen.has(signature) || visibleSeen.has(visibleSignature)) { skipped++; return; }
          seen.add(signature); visibleSeen.add(visibleSignature);
          const serial = rowIndex * 6 + spanIndex * 2 + materialIndex + 1, tags = new Set([enabled ? 'span' : 'no-span', 'storage']);
          if (bounds.minWidth >= 420) tags.add('wide');
          if (enabled || modules.some(function (module) { return ['open', 'hybrid'].includes(module.front); })) tags.add('airy');
          if (upper.length) tags.add('wall');
          if (upper.some(function (entry) { return entry.type === 'UW'; })) tags.add('upper-box');
          if (upper.some(function (entry) { return ['vertical', 'vertical-glass'].includes(entry.front); })) tags.add('vertical');
          if (upper.some(function (entry) { return entry.type === 'WS'; })) tags.add('shelf');
          const collection = upper.length ? 'wall' : enabled ? 'airy' : 'storage';
          const price = totalPrice(products, config);
          result.push(addLazyLayout({
            id: 'library-wide-' + String(serial).padStart(4, '0'), combinationSku: 'KMB-WD-' + String(serial).padStart(4, '0'),
            name: 'ADØP TV ünitesi ' + fmt(width) + ' cm', note: compositionNote(products),
            intent: modules.length + ' base modüllü geniş düzen' + (enabled ? ', ' + span + ' cm adapte edilebilir tabla' : ', tablasız') + (upper.length ? ' ve ' + upper.length + ' duvar modül / raf.' : '.'),
            source: 'Geniş modül seçkisi', libraryGenerated: true, wideGenerated: true, geometryKey: key, collection: collection, tags: Array.from(tags),
            widths: modules.map(function (module) { return module.width; }), fronts: modules.map(function (module) { return module.front; }),
            span: config.span, spanEnabled: enabled, spanOffset: offset, upper: config.upper,
            finish: config.bodyFinish, bodyFinish: config.bodyFinish, frontFinish: config.frontFinish, spanFinish: config.spanFinish,
            config: config, bounds: bounds, width: width, actualWidth: width,
            baseStorageWidth: end, storageWidth: end, upperWidth: upperWidth, fixedWidth: fixedWidth, price: price
          }, key, config));
          count++; if (isMonochrome(config)) monochromeCount++; else twoToneCount++;
        });
      });
    });
    return { sequences: rows.length, count: count, monochromeCount: monochromeCount, twoToneCount: twoToneCount, skipped: skipped };
  }

  // Glazed doors are alternatives to real 45 / 60 cm base products and to
  // the 60 cm / vertical wall products. Keep their measured positions and
  // supports, then append a small, balanced selection after all saved IDs.
  function appendGlassVariants(result, originals, seen) {
    const established = originals.concat(result), sourceSeen = new Set(), candidateSeen = new Set();
    const visibleSeen = new Set(established.map(function (item) { return visiblePhysicalKey(item.config); }));
    const candidates = [], selected = new Set(), targets = [90, 120, 150, 180, 189, 210, 240, 270, 297.4, 300, 312, 330, 360, 390, 420, 450, 480, 540, 600, 660, 720, 780, 840, 900];
    const finishes = editorialFinishes.slice();
    const accents = { oak: ['cream', 'olive'], 'dark-oak': ['cream', 'olive'], 'black-oak': ['cream'], cream: ['oak', 'dark-oak', 'olive', 'black-oak'], olive: ['oak', 'dark-oak', 'cream'] };
    established.forEach(function (source, sourceIndex) {
      if (!source.libraryGenerated || !isCuratedPalette(source) || hasGlass(source) || sourceSeen.has(source.geometryKey)) return;
      sourceSeen.add(source.geometryKey);
      ['base', 'upper'].forEach(function (mode) {
        const config = C.clean(source.config), entries = mode === 'base' ? config.modules : config.upper;
        const eligible = entries.map(function (module, index) {
          const allowed = mode === 'base' ? [45, 60].includes(module.width) && module.front !== 'open' : module.type === 'UW' && ['drop', 'vertical'].includes(module.front);
          return allowed ? index : -1;
        }).filter(function (index) { return index >= 0; });
        if (!eligible.length) return;
        const first = eligible[sourceIndex % 2 ? eligible.length - 1 : 0], chosen = [first];
        // Adjacent doors may form a pair; isolated glazed accents stay single.
        const neighbour = eligible.find(function (index) {
          if (index === first) return false;
          const a = entries[first], b = entries[index];
          if (mode === 'base') return config.modules.length >= 5 && Math.abs(index - first) === 1;
          return a.front === 'vertical' && b.front === 'vertical' && a.y === b.y && Math.abs(a.x - b.x) === 36;
        });
        if (neighbour !== undefined && sourceIndex % 3 === 0) chosen.push(neighbour);
        chosen.forEach(function (index) { entries[index].front = entries[index].front === 'vertical' ? 'vertical-glass' : 'fluted-glass'; });
        // A remaining opaque front makes the mono / two-tone pair an actual
        // visual choice. Clear glass itself never adds a second finish.
        if (!hasOpaqueFront(config)) return;
        const key = geometryKey(config);
        if (candidateSeen.has(key)) return;
        candidateSeen.add(key);
        candidates.push({ source: source, sourceIndex: sourceIndex, config: config, key: key, mode: mode });
      });
    });
    function fits(candidate, target) {
      const source = candidate.source, geometry = geometries.get(source.geometryKey), config = candidate.config;
      if (source.bounds.minWidth > target + EPSILON || source.bounds.maxWidth < target - EPSILON) return false;
      if (!config.spanEnabled) return Math.abs(source.bounds.fixedWidth - target) < EPSILON;
      const offset = closestAtOrBelow(geometry.mechanics.offsets, target - config.span);
      return offset !== null && Math.abs(Math.max(source.bounds.fixedWidth, offset + config.span) - target) < EPSILON;
    }
    let geometryCount = 0, count = 0, monochromeCount = 0, twoToneCount = 0;
    targets.forEach(function (target, targetIndex) {
      for (let slot = 0; slot < 4; slot++) {
        const mode = slot % 2 === 0 ? 'base' : 'upper';
        const pool = candidates.filter(function (candidate) { return candidate.mode === mode && !selected.has(candidate.key) && fits(candidate, target); });
        pool.sort(function (a, b) { return rank(a.sourceIndex + 1, targetIndex * 4 + slot + 101) - rank(b.sourceIndex + 1, targetIndex * 4 + slot + 101) || a.key.localeCompare(b.key); });
        const candidate = pool[0];
        if (!candidate) throw new Error('Flüt cam seçkisi için geçerli yerleşim eksik: ' + target + ' / ' + mode);
        selected.add(candidate.key);
        const source = candidate.source, serial = geometryCount + 1, body = finishes[geometryCount % finishes.length], accentPool = accents[body];
        const pair = [[body, body, body], [body, accentPool[Math.floor(geometryCount / finishes.length) % accentPool.length], body]];
        geometries.set(candidate.key, geometries.get(source.geometryKey));
        pair.forEach(function (palette, materialIndex) {
          const config = C.clean({ ...candidate.config, bodyFinish: palette[0], frontFinish: palette[1], spanFinish: palette[2] });
          const signature = physicalKey(config), visibleSignature = visiblePhysicalKey(config), products = productList(config);
          if (seen.has(signature) || visibleSeen.has(visibleSignature)) throw new Error('Tekrarlanan flüt cam seçkisi.');
          seen.add(signature); visibleSeen.add(visibleSignature);
          const tags = new Set(source.tags); tags.add('glass');
          const item = {};
          Object.keys(source).forEach(function (key) { if (key !== 'layout') item[key] = source[key]; });
          Object.assign(item, {
            id: 'library-glass-' + String(serial).padStart(3, '0') + '-' + (materialIndex + 1),
            combinationSku: 'KMB-GL-' + String(serial).padStart(3, '0') + '-' + (materialIndex + 1),
            note: compositionNote(products), source: 'Flüt cam modül seçkisi', glassGenerated: true,
            monochromeVariant: materialIndex === 0,
            glassSourceId: source.id, glassPlacement: candidate.mode, geometryKey: candidate.key, tags: Array.from(tags),
            fronts: config.modules.map(function (module) { return module.front; }), upper: config.upper,
            finish: body, bodyFinish: body, frontFinish: palette[1], spanFinish: body, config: config,
            price: totalPrice(products, config)
          });
          result.push(addLazyLayout(item, candidate.key, config));
          count++; if (isMonochrome(config)) monochromeCount++; else twoToneCount++;
        });
        geometryCount++;
      }
    });
    return { geometryCount: geometryCount, count: count, monochromeCount: monochromeCount, twoToneCount: twoToneCount };
  }

  // Reuse established cabinet arrangements and mechanics for the two new
  // lacquers. This bounded appendix never reorders or recolours a saved ID.
  function appendNewLacquerVariants(result, originals, seen) {
    const established = originals.concat(result), selected = new Set(), sourceOrder = new Map(established.map(function (item, index) { return [item.id, index]; }));
    const targets = [160, 165, 175, 180, 189, 200, 210, 225, 240, 260, 275, 297.4, 300, 312, 330, 360, 390, 420, 450, 500];
    let count = 0;
    targets.forEach(function (target, index) {
      const candidates = established.filter(function (item) {
        if (!item.libraryGenerated || !item.config.spanEnabled || selected.has(item.geometryKey)) return false;
        const geometry = geometries.get(item.geometryKey), bounds = item.bounds;
        if (bounds.minWidth > target + EPSILON || bounds.maxWidth < target - EPSILON) return false;
        const offset = closestAtOrBelow(geometry.mechanics.offsets, target - item.config.span);
        return offset !== null && Math.abs(Math.max(bounds.fixedWidth, offset + item.config.span) - target) < EPSILON;
      });
      candidates.sort(function (a, b) { return rank(sourceOrder.get(a.id) + 1, index + 211) - rank(sourceOrder.get(b.id) + 1, index + 211) || a.id.localeCompare(b.id); });
      const source = candidates[0];
      if (!source) throw new Error('Yeni lake seçkisi için mevcut yerleşim eksik: ' + target);
      selected.add(source.geometryKey);
      const offset = closestAtOrBelow(geometries.get(source.geometryKey).mechanics.offsets, target - source.config.span);
      ['light-grey', 'burgundy'].forEach(function (finishId) {
        const config = C.clean({ ...source.config, spanOffset: offset, bodyFinish: finishId, frontFinish: finishId, spanFinish: finishId, upper: C.resolveUpper(source.config.upper, target) });
        const signature = physicalKey(config), finish = M.finishes.find(function (entry) { return entry.id === finishId; }), item = {};
        if (seen.has(signature)) return;
        seen.add(signature);
        Object.keys(source).forEach(function (key) { if (key !== 'layout') item[key] = source[key]; });
        Object.assign(item, {
          id: 'library-new-lacquer-' + finishId + '-' + String(index + 1).padStart(2, '0'),
          combinationSku: 'KMB-NL-' + finish.code + '-' + String(index + 1).padStart(2, '0'),
          name: 'ADØP TV ünitesi ' + fmt(target) + ' cm', source: 'Yeni lake renk seçkisi',
          newLacquerVariant: true, monochromeVariant: true, libraryGenerated: true,
          finish: finishId, bodyFinish: finishId, frontFinish: finishId, spanFinish: finishId,
          config: config, upper: config.upper, spanOffset: offset, width: target, actualWidth: target,
          price: totalPrice(productList(config), config)
        });
        result.push(addLazyLayout(item, source.geometryKey, config));
        count++;
      });
    });
    return { count: count };
  }


  // Extend the new lacquer appendix with one two-tone counterpart per finish
  // and target width. Existing IDs and their five-colour assignments stay put.
  // Each source already has a visible opaque door, so these are real material
  // alternatives rather than invisible colour changes behind glass.
  function appendNewLacquerDualVariants(result, originals, seen) {
    const sources = new Map();
    result.forEach(function (item) {
      if (item.newLacquerVariant && isMonochrome(item) && hasOpaqueFront(item.config) && !sources.has(item.geometryKey)) sources.set(item.geometryKey, item);
    });
    const greyPairs = [['oak', 'light-grey'], ['dark-oak', 'light-grey'], ['black-oak', 'light-grey'], ['cream', 'light-grey']];
    const burgundyPairs = [['oak', 'burgundy'], ['dark-oak', 'burgundy'], ['cream', 'burgundy'], ['light-grey', 'burgundy'], ['burgundy', 'cream']];
    const visibleSeen = new Set(originals.concat(result).map(function (item) { return visiblePhysicalKey(item.config); }));
    let count = 0, sourceIndex = 0;
    sources.forEach(function (source) {
      const index = sourceIndex++;
      [greyPairs[index % greyPairs.length], burgundyPairs[index % burgundyPairs.length]].forEach(function (pair, pairIndex) {
        const config = C.clean({ ...source.config, bodyFinish: pair[0], frontFinish: pair[1], spanFinish: pair[0] });
        const signature = physicalKey(config), visibleSignature = visiblePhysicalKey(config), item = {};
        if (seen.has(signature) || visibleSeen.has(visibleSignature)) throw new Error('Tekrarlanan yeni lake çift renk seçkisi.');
        seen.add(signature); visibleSeen.add(visibleSignature);
        Object.keys(source).forEach(function (key) { if (key !== 'layout') item[key] = source[key]; });
        Object.assign(item, {
          id: 'library-new-lacquer-dual-' + (pairIndex === 0 ? 'light-grey' : 'burgundy') + '-' + String(index + 1).padStart(2, '0'),
          combinationSku: 'KMB-ND-' + (pairIndex === 0 ? 'LGR' : 'BRG') + '-' + String(index + 1).padStart(2, '0'),
          source: 'Yeni lake çift renk seçkisi', newLacquerDualVariant: true, monochromeVariant: false,
          finish: pair[0], bodyFinish: pair[0], frontFinish: pair[1], spanFinish: pair[0], config: config,
          price: totalPrice(productList(config), config)
        });
        result.push(addLazyLayout(item, source.geometryKey, config));
        count++;
      });
    });
    return { count: count };
  }

  function totalPrice(products, config) {
    const amounts = products.map(function (product) { return M.price(product, config); });
    return amounts.every(Number.isFinite) ? amounts.reduce(function (total, amount) { return total + amount; }, 0) : null;
  }

  function productList(config) {
    const result = config.modules.map(function (m) { return productsById.get('bb-' + m.width + '-' + m.front); });
    if (config.spanEnabled) result.push(productsById.get('st-' + config.span));
    config.upper.forEach(function (u) { result.push(productsById.get(u.type.toLowerCase() + '-' + u.width + (u.type === 'UW' ? '-' + u.front : ''))); });
    if (result.some(function (p) { return !p; })) throw new Error('Kitaplıkta geçersiz bir modül var.');
    return result;
  }

  function compositionNote(products) {
    const grouped = new Map();
    products.forEach(function (product) {
      const entry = grouped.get(product.id);
      if (entry) entry.count++;
      else grouped.set(product.id, { name: product.name, count: 1 });
    });
    return Array.from(grouped.values()).map(function (entry) { return (entry.count > 1 ? entry.count + ' × ' : '') + entry.name; }).join(', ') + '.';
  }

  function cachedLayout(key, config) {
    const cacheKey = key + '|fit:' + (config.spanEnabled ? config.spanOffset : 0) + heightKey(config);
    if (layouts.has(cacheKey)) {
      const value = layouts.get(cacheKey);
      layouts.delete(cacheKey); layouts.set(cacheKey, value);
      return value;
    }
    const value = C.layout(config);
    layoutBuilds++;
    layouts.set(cacheKey, value);
    if (layouts.size > LAYOUT_CACHE_LIMIT) layouts.delete(layouts.keys().next().value);
    return value;
  }

  function addLazyLayout(item, key, config) {
    Object.defineProperty(item, 'layout', {
      enumerable: true,
      configurable: false,
      get: function () { return cachedLayout(key, config); }
    });
    return item;
  }

  function build() {
    if (generated) return generated;
    const start = now(), originals = (global.AdopCombinations || []).filter(function (item) { return !item.libraryGenerated; });
    const seen = new Set(originals.map(function (item) { return physicalKey(item.config); }));
    const baseSequences = sequences(), result = [];
    let duplicates = 0, glazedGeometries = 0;
    baseSequences.forEach(function (sequence, sequenceIndex) {
      let end = 0;
      const modules = sequence.indices.map(function (index) {
        const product = baseProducts[index], module = { width: product.width, front: product.front, x: end };
        end += product.width;
        return module;
      });
      [0, 120, 180].forEach(function (span, spanIndex) {
        const enabled = span > 0, mechanics = enabled ? mechanical(modules, span) : null;
        const offset = mechanics ? mechanics.offset : 0, width = enabled ? Math.max(end, offset + span) : end;
        // Plan compact groups inside the minimum ground width. Edge anchors
        // then follow the actual fitted width without increasing that minimum.
        const upperArea = enabled ? Math.max(end, mechanics.minOffset + span) : end;
        const upper = C.resolveUpper(upperPattern((sequenceIndex * 3 + spanIndex) % 14, upperArea, sequenceIndex % 2 === 0), width);
        // Sixteen material variants introduce the new framed glass doors
        // without re-numbering or multiplying the established catalogue.
        if (spanIndex === 2 && glazedGeometries < 8 && upper.some(function (u) { return u.type === 'UW' && ['drop', 'vertical'].includes(u.front); })) {
          upper.forEach(function (u) { if (u.type === 'UW' && u.front === 'drop') u.front = 'fluted-glass'; else if (u.type === 'UW' && u.front === 'vertical') u.front = 'vertical-glass'; });
          glazedGeometries++;
        }
        const baseConfig = C.clean({ modules: modules, spanEnabled: enabled, span: span || 180, spanOffset: offset, upper: upper });
        const key = geometryKey(baseConfig), products = productList(baseConfig);
        const upperWidth = Math.max(0, ...upper.map(function (u) { return u.x + u.width; }));
        const fixedWidth = Math.max(end, C.upperBounds(upper).minWidth);
        const bounds = {
          baseStorageWidth: end, storageWidth: end, upperWidth: upperWidth, fixedWidth: fixedWidth,
          min: enabled ? Math.max(fixedWidth, mechanics.minOffset + span) : fixedWidth,
          max: enabled ? Math.max(fixedWidth, mechanics.maxOffset + span) : fixedWidth,
          spanEnabled: enabled, valid: true,
          minOffset: enabled ? mechanics.minOffset : null, maxOffset: enabled ? mechanics.maxOffset : null
        };
        bounds.minWidth = bounds.min; bounds.maxWidth = bounds.max;
        geometries.set(key, { mechanics: mechanics, bounds: bounds });
        const pair = palettePairs[(sequenceIndex + spanIndex * 3) % palettePairs.length];
        pair.forEach(function (palette, materialIndex) {
          const config = C.clean({ ...baseConfig, bodyFinish: palette[0], frontFinish: palette[1], spanFinish: palette[2] });
          const signature = physicalKey(config);
          if (seen.has(signature)) { duplicates++; return; }
          seen.add(signature);
          // The serial is allocated before de-duplication; an omitted duplicate
          // cannot change the IDs of any later saved or shared configuration.
          const serial = 25 + sequenceIndex * 6 + spanIndex * 2 + materialIndex;
          const tags = new Set([enabled ? 'span' : 'no-span']);
          if (width <= 210) tags.add('compact');
          if (modules.length >= 3 || modules.some(function (m) { return ['drawers', 'deep-drawer', 'hybrid'].includes(m.front); })) tags.add('storage');
          if (enabled || modules.some(function (m) { return m.front === 'open' || m.front === 'hybrid'; })) tags.add('airy');
          if (upper.length) tags.add('wall');
          if (upper.some(function (u) { return u.type === 'UW'; })) tags.add('upper-box');
          if (upper.some(function (u) { return ['vertical', 'vertical-glass'].includes(u.front); })) tags.add('vertical');
          if (upper.some(function (u) { return u.type === 'WS'; })) tags.add('shelf');
          const collection = upper.length ? 'wall' : width <= 180 ? 'compact' : enabled || tags.has('airy') ? 'airy' : 'storage';
          tags.add(collection);
          const price = totalPrice(products, config);
          result.push(addLazyLayout({
            id: 'library-' + String(serial).padStart(4, '0'),
            combinationSku: 'KMB-LG-' + String(serial).padStart(3, '0'),
            name: 'ADØP TV ünitesi ' + fmt(width) + ' cm',
            note: compositionNote(products),
            intent: modules.length + ' base modüllü düzen' + (enabled ? ', ' + span + ' cm adapte edilebilir tabla' : ', tablasız') + (upper.length ? ' ve ' + upper.length + ' duvar modül / raf.' : '.'),
            source: 'Modül kitaplığı', libraryGenerated: true, geometryKey: key,
            collection: collection, tags: Array.from(tags),
            widths: modules.map(function (m) { return m.width; }), fronts: modules.map(function (m) { return m.front; }),
            span: config.span, spanEnabled: enabled, spanOffset: offset, upper: config.upper,
            finish: config.bodyFinish, bodyFinish: config.bodyFinish, frontFinish: config.frontFinish, spanFinish: config.spanFinish,
            config: config, bounds: bounds, width: width, actualWidth: width,
            baseStorageWidth: end, storageWidth: end, upperWidth: upperWidth, fixedWidth: fixedWidth,
            price: price
          }, key, config));
        });
      });
    });
    const monochromeSelection = appendMonochromeVariants(result, originals, seen);
    const wideSelection = appendWideVariants(result, originals, seen);
    const glassSelection = appendGlassVariants(result, originals, seen);
    const newLacquerSelection = appendNewLacquerVariants(result, originals, seen);
    const newLacquerDualSelection = appendNewLacquerDualVariants(result, originals, seen);
    generated = result;
    statistics = {
      version: 5, originalCount: originals.length, generatedCount: result.length,
      totalCount: originals.length + result.length, distinctBaseSequences: baseSequences.length + wideSelection.sequences,
      geometryCount: geometries.size, mechanicalCacheEntries: mechanicalCache.size,
      duplicateConfigurationsSkipped: duplicates, monochromeVariantsAdded: monochromeSelection.added,
      curatedMonochromeCount: monochromeSelection.monochromeCount + wideSelection.monochromeCount + glassSelection.monochromeCount + newLacquerSelection.count, curatedTwoToneCount: monochromeSelection.twoToneCount + wideSelection.twoToneCount + glassSelection.twoToneCount + newLacquerDualSelection.count,
      wideBaseSequences: wideSelection.sequences, wideVariantsAdded: wideSelection.count, wideDuplicateConfigurationsSkipped: wideSelection.skipped,
      glassGeometriesAdded: glassSelection.geometryCount, glassVariantsAdded: glassSelection.count, newLacquerVariantsAdded: newLacquerSelection.count + newLacquerDualSelection.count,
      newLacquerMonochromeVariantsAdded: newLacquerSelection.count, newLacquerDualVariantsAdded: newLacquerDualSelection.count,
      buildMilliseconds: Math.round((now() - start) * 10) / 10,
      minWidth: Math.min(...result.map(function (item) { return item.width; })),
      maxWidth: Math.max(...result.map(function (item) { return item.width; }))
    };
    return generated;
  }

  function install() {
    const items = global.AdopCombinations || (global.AdopCombinations = []), existing = new Set(items.map(function (item) { return item.id; }));
    build().forEach(function (item) { if (!existing.has(item.id)) { items.push(item); existing.add(item.id); } });
    return items;
  }

  function closestAtOrBelow(offsets, ceiling) {
    let low = 0, high = offsets.length - 1, result = -1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (offsets[middle] <= ceiling + EPSILON) { result = middle; low = middle + 1; }
      else high = middle - 1;
    }
    return result < 0 ? null : offsets[result];
  }

  // F.fit-compatible result. Filtering thousands of library entries needs only
  // a binary search in a shared offset list; meshes are built for visible cards.
  function fit(item, wall, clearance) {
    build();
    if (!item || !item.libraryGenerated || !geometries.has(item.geometryKey)) {
      return global.AdopCombinationFit ? global.AdopCombinationFit.fit(item, wall, clearance) : null;
    }
    const gap = clearance === undefined ? 10 : Number(clearance), unrestricted = wall === null || wall === undefined;
    const wallWidth = unrestricted ? null : Number(wall);
    if (!Number.isFinite(gap) || gap < 0 || (!unrestricted && (!Number.isFinite(wallWidth) || wallWidth <= 0))) return null;
    const availableWidth = unrestricted ? null : wallWidth - 2 * gap, geometry = geometries.get(item.geometryKey), bounds = geometry.bounds;
    if (!unrestricted && (availableWidth < 0 || bounds.minWidth > availableWidth + EPSILON)) return null;
    const contextKey = (unrestricted ? 'all' : wallWidth) + '|' + gap;
    if (!fitContexts.has(contextKey)) {
      fitContexts.set(contextKey, new Map());
      if (fitContexts.size > FIT_CONTEXT_LIMIT) fitContexts.delete(fitContexts.keys().next().value);
    }
    const context = fitContexts.get(contextKey);
    let fitted = context.get(item.geometryKey);
    if (!fitted) {
      let offset = item.config.spanOffset;
      if (item.config.spanEnabled && !unrestricted) offset = closestAtOrBelow(geometry.mechanics.offsets, availableWidth - item.config.span);
      if (offset === null) return null;
      const width = item.config.spanEnabled ? Math.max(bounds.fixedWidth, offset + item.config.span) : bounds.fixedWidth;
      fitted = { offset: offset, width: width };
      context.set(item.geometryKey, fitted);
    }
    const config = { ...item.config, spanOffset: fitted.offset, upper: C.resolveUpper(item.config.upper, fitted.width) }, result = {};
    Object.keys(item).forEach(function (key) { if (key !== 'layout') result[key] = item[key]; });
    const residual = unrestricted ? null : rounded(wallWidth - fitted.width);
    Object.assign(result, {
      config: config, bounds: bounds, wall: wallWidth, clearance: gap, availableWidth: availableWidth, targetWidth: availableWidth,
      actualWidth: fitted.width, width: fitted.width, name: 'ADØP TV ünitesi ' + fmt(fitted.width) + ' cm',
      residual: residual, sideGap: residual === null ? null : rounded(residual / 2),
      freeWidth: unrestricted ? null : rounded(availableWidth - fitted.width),
      adapted: Math.abs(fitted.offset - item.config.spanOffset) > EPSILON
    });
    return addLazyLayout(result, item.geometryKey, config);
  }

  function getStats() {
    build();
    return { ...statistics, cachedLayouts: layouts.size, layoutBuilds: layoutBuilds, fitContexts: fitContexts.size };
  }

  function fitExact(item, wall) {
    const fitted = fit(item, wall, 0);
    if (!fitted || wall === null || wall === undefined) return fitted;
    return Math.abs(fitted.actualWidth - Number(wall)) < .051 ? fitted : null;
  }

  global.AdopCombinationLibrary = { version: 5, build: build, install: install, fit: fit, fitExact: fitExact, getStats: getStats, isMonochrome: isMonochrome, hasGlass: hasGlass };
  install();
})(typeof window !== 'undefined' ? window : globalThis);
