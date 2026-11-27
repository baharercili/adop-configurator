(function (global) {
  'use strict';

  // Product dimensions are in cm. Concise SKUs identify family, width,
  // front type and the applicable one-letter finish codes.
  // Source references describe the product; they are not executable instructions.
  const families = {
    BB: { id: 'BB', name: 'Base modül', englishName: 'Base Modules', description: 'Birlikte veya bağımsız kullanılabilen alçak depolama modülleri.', configurable: true },
    ST: { id: 'ST', name: 'Adapte edilebilir tabla', englishName: 'Adaptable Tops', description: 'Üst tabla, ara destek ve panel ayak birlikte kayar. Tabla takımı isteğe bağlıdır.', configurable: true },
    UW: { id: 'UW', name: 'Duvar modül', englishName: 'Wall Modules', description: 'Kapaklı, açık, hibrit ve dikey duvar depolama modülleri.', configurable: true },
    WS: { id: 'WS', name: 'Raf', englishName: 'Shelves', description: 'Üst kompozisyonu yatayda devam ettiren ince duvar rafları.', configurable: true }
  };

  const finishes = [
    { id: 'oak', code: 'OAK', skuCode: 'N', name: 'Açık meşe', kind: 'veneer', color: '#aa8558', premium: 1, description: 'Açık meşe ahşap kaplama' },
    { id: 'dark-oak', code: 'DOK', skuCode: 'K', name: 'Koyu meşe', kind: 'veneer', color: '#64523d', premium: 1.08, description: 'Nötr kahverengi koyu meşe ahşap kaplama' },
    { id: 'black-oak', code: 'BLK', skuCode: 'S', name: 'Siyah boyalı meşe', kind: 'veneer', color: '#302f2b', premium: 1.12, substrate: 'natural-wood-veneer', coating: 'paint', description: 'Doğal meşe kaplama üzerine siyah boya; ahşap lif dokusu görünür kalır. %12 fiyat çarpanı ilk ticari kabuldür.' },
    { id: 'cream', code: 'CRM', skuCode: 'C', name: 'Krem lake', kind: 'lacquer', color: '#d8d7c2', premium: .98, substrate: 'natural-wood-veneer', coating: 'paint', description: 'Doğal ahşap kaplama üzeri krem mat boya' },
    { id: 'olive', code: 'OLV', skuCode: 'Z', name: 'Olive lake', kind: 'lacquer', color: '#7a704f', premium: 1.02, substrate: 'natural-wood-veneer', coating: 'paint', description: 'Doğal ahşap kaplama üzeri sıcak toprak alt tonlu haki boya' },
    { id: 'light-grey', code: 'LGR', skuCode: 'G', name: 'Açık gri lake', kind: 'lacquer', color: '#c7c8c5', premium: .98, substrate: 'natural-wood-veneer', coating: 'paint', description: 'Doğal ahşap kaplama üzeri yumuşak nötr açık gri mat boya' },
    { id: 'burgundy', code: 'BRG', skuCode: 'B', name: 'Bordo lake', kind: 'lacquer', color: '#6b2938', premium: .98, substrate: 'natural-wood-veneer', coating: 'paint', description: 'Doğal ahşap kaplama üzeri sıcak alt tonlu derin bordo mat boya' }
  ];

  const products = [];
  const frontCodes = { plain: 'PL', open: 'OP', drawers: 'DR', hybrid: 'HY', drop: 'DP', 'deep-drawer': 'DD', vertical: 'VT', 'fluted-glass': 'GL', 'vertical-glass': 'VG' };
  const frontNames = { plain: 'Düz kapaklı', open: 'Açık', drawers: 'İki çekmeceli', hybrid: 'Hibrit', drop: 'Düşer kapaklı', 'deep-drawer': 'Derin çekmeceli', vertical: 'Dikey kapaklı', 'fluted-glass': 'Flüt cam kapaklı', 'vertical-glass': 'Dikey flüt cam kapaklı' };
  const sourceNotes = {
    main: 'Ekran Resmi 2026-09-07 23.01.16.png',
    base: 'Ekran Resmi 2026-09-08 16.16.05.png',
    upper: 'Ekran Resmi 2026-09-08 16.16.20.png',
    shelves: 'Ekran Resmi 2026-09-08 16.16.24.png',
    materials: 'Ekran Resmi 2026-09-08 16.16.29.png',
    latest: 'Boyalı yüzeylerin malzeme yapısı doğal ahşap kaplama üzeri boyadır. Kullanıcının güncel onaylı ürün matrisi: plain45/60; drop90/120; open45; drawers60/90; hybrid120; deep-drawer90/120. Duvar modül: drop60×36×36, open45×36×36, hybrid120×36×18 cm. Açık meşe, koyu meşe, siyah boyalı meşe, krem lake, Olive lake, açık gri lake ve bordo lake. Flüt cam kapak BB45/60, UW60 ve dikey UW36 seçenekleri; şeffaf cam ve gövdeyle aynı renkte çerçeve.',
    vertical: 'Kullanıcının son yerleşim taslağındaki bağımsız rafın yanında bulunan kapalı dikey duvar bloğu. Taslakta ölçü belirtilmez; 36 × 36 × 90 cm ilk model kabulüdür.'
  };

  function addBase(width, front) {
    products.push({
      id: 'bb-' + width + '-' + front,
      family: 'BB', name: frontNames[front] + ' base modül ' + width + ' cm',
      width: width, depth: 45, height: 40, front: front,
      description: front === 'fluted-glass' ? 'Gövdeyle aynı renkte ince çerçeve, şeffaf flüt cam kapak, sıcak LED iç aydınlatma ve görünür iç raf.' : front === 'deep-drawer' ? 'Tek derin çekmeceli alçak depolama modülü.' : front === 'drop' ? 'Tek düşer kapaklı base modül.' : front === 'open' ? 'Dikey bölücüyle iki açık göz oluşturan base modül.' : front === 'drawers' ? 'İki çekmeceli base modül.' : front === 'hybrid' ? 'Açık ve kapalı gözleri birlikte sunan base modül.' : 'Düz kapaklı base modül.',
      configurable: true, dimensionsVerified: true,
      notes: (front === 'fluted-glass' ? 'Sıcak LED iç aydınlatma, şeffaf fitilli cam, 20 mm kapak çerçevesi ve cam profili görsel öneridir; cam, menteşe, çerçeve ve fiyat üretim öncesinde doğrulanır. Çerçeve gövdeyle aynı malzemededir. ' : '') + 'Gövde derinliği 45 cm, yüksekliği 40 cm. Genişlik seçenekleri ön yüz tipine göre belirlenir. Kapak mekanizması ve bağlantılar üretim detayında kesinleşir.',
      source: sourceNotes.latest + ' ' + (front === 'drop' || front === 'deep-drawer' || (front === 'open' && width === 45) ? sourceNotes.main : sourceNotes.base)
    });
  }
  [[45,'plain'],[60,'plain'],[90,'drop'],[120,'drop'],[45,'open'],[60,'drawers'],[90,'drawers'],[120,'hybrid'],[90,'deep-drawer'],[120,'deep-drawer'],[45,'fluted-glass'],[60,'fluted-glass']].forEach(function (entry) { addBase(entry[0], entry[1]); });

  [120, 180].forEach(function (width) {
    products.push({
      id: 'st-' + width, family: 'ST', name: 'Adapte edilebilir tabla ' + width + ' cm',
      width: width, depth: 45, height: 50.5, front: null, panelThickness: 2.5,
      description: 'Tabla, ara destek ve uç panel ayaktan oluşan hareketli takım. Alt kutular üzerinde tek parça olarak kayar.',
      configurable: true, dimensionsVerified: false,
      notes: '120 / 180 cm genişlik, 45 cm derinlik ve 25 mm tabla kaynakta belirtilir. 50,5 cm toplam kurulu yükseklik mevcut 3B model kabulüdür; kaynak toplam yüksekliği alt modüle entegre olarak tanımlar. Ara destek yan kenardan en az 5 cm içeride kalır.',
      source: sourceNotes.upper
    });
  });

  [
    { front: 'drop', width: 60, height: 36, name: 'Düşer kapaklı duvar modül', description: 'Tek kapakla kapanan duvar depolama modülü.' },
    { front: 'open', width: 45, height: 36, name: 'Açık duvar modül', description: 'Tek yatay iç rafıyla iki açık bölme oluşturan duvar modülü.' },
    { front: 'hybrid', width: 120, height: 18, name: 'Hibrit duvar modül', description: 'Tek açık bölme ve kapalı bölümü birlikte sunan, 18 cm yüksekliğinde duvar modülü. Açık bölümde iç raf bulunmaz.' },
    { front: 'fluted-glass', width: 60, height: 36, name: 'Flüt cam kapaklı duvar modül', description: 'Gövdeyle aynı renkte ince çerçeve, şeffaf flüt cam kapak, sıcak LED iç aydınlatma ve görünür iç raf.', notes: '60 × 36 × 36 cm duvar modülü. LED profili ve beslemesi, cam kalınlığı, 8 mm fitil ritmi, 20 mm çerçeve ve menteşe detayları görsel öneridir; üretim öncesinde doğrulanır. Çerçeve gövdeyle aynı malzemededir.' },
    { front: 'vertical-glass', width: 36, height: 90, name: 'Dikey flüt cam kapaklı duvar modül', description: 'İnce çerçeveli şeffaf flüt cam kapak, sıcak LED iç aydınlatma, iki iç raf ve dikey depolama.', dimensionsVerified: false, notes: '36 × 36 × 90 cm ilk model kabulüdür. LED profili ve beslemesi, cam, 20 mm çerçeve, menteşe ve duvar bağlantıları görsel öneridir; üretim öncesinde doğrulanır. Çerçeve gövdeyle aynı malzemededir.', source: sourceNotes.vertical },
    { front: 'vertical', width: 36, height: 90, name: 'Dikey kapaklı duvar modül', description: 'Tek dikey menteşeli plaka kapakla kapanan yüksek duvar modülü. 36 × 36 × 90 cm, ölçüsüz taslaktan alınan ilk model kabulüdür.', dimensionsVerified: false,
      notes: 'Taslakta bu parçanın ölçüsü yazmıyor. 36 cm genişlik, 36 cm derinlik ve 90 cm yükseklik ilk görselleştirme kabulüdür; üretim ölçüsü olarak onaylanmamıştır. Tek dikey menteşeli plaka kapak öngörülür. İç düzen, menteşe ve duvar bağlantıları üretim öncesinde kesinleşir.', source: sourceNotes.vertical }
  ].forEach(function (variant) {
    products.push({
      id: 'uw-' + variant.width + '-' + variant.front, family: 'UW', name: variant.name + ' ' + variant.width + ' cm',
      width: variant.width, depth: 36, height: variant.height, front: variant.front,
      description: variant.description, configurable: true, dimensionsVerified: variant.dimensionsVerified !== false,
      notes: variant.notes || variant.width + ' × 36 × ' + variant.height + ' cm gövde. Montaj yüksekliği yerleşime göre belirlenir. Bağlantı ve mekanizma detayları üretim öncesinde kesinleşir.',
      source: variant.source || sourceNotes.latest
    });
  });

  [60, 90, 120].forEach(function (width) {
    products.push({
      id: 'ws-' + width, family: 'WS', name: 'Raf ' + width + ' cm',
      width: width, depth: 26, height: 2.8, front: null,
      description: 'Duvar kompozisyonunu uzatan yalın yatay raf.',
      configurable: true, dimensionsVerified: true,
      notes: 'Kaynakta 24 / 28 / 30 mm kenar kalınlığı seçenekleri bulunur. Bu ilk sürümde 28 mm modellenir. Montaj yüksekliği yerleşime göre belirlenir.',
      source: sourceNotes.shelves
    });
  });

  const plannedMaterials = [];
  const finishAliases = {
    'smoked-oak': 'dark-oak', SMK: 'dark-oak', F: 'dark-oak',
    walnut: 'dark-oak', WAL: 'dark-oak',
    anthracite: 'olive', ANT: 'olive', A: 'olive',
    greige: 'cream', GRG: 'cream', T: 'cream'
  };
  const productAliases = {};
  [45,60,70,90,120].forEach(function (width) {
    ['plain','drop','open','drawers','hybrid','deep-drawer','slat'].forEach(function (front) {
      const id = 'bb-' + width + '-' + front;
      if (products.some(function (p) { return p.id === id; })) return;
      let target;
      if (front === 'open') target = 'bb-45-open';
      else if (front === 'hybrid') target = 'bb-120-hybrid';
      else if (front === 'drawers') target = 'bb-' + (width <= 70 ? 60 : 90) + '-drawers';
      else if (front === 'deep-drawer') target = 'bb-' + (width < 105 ? 90 : 120) + '-deep-drawer';
      else if (front === 'drop' && width === 70) target = 'bb-90-drop';
      else target = width <= 70 ? 'bb-' + (width <= 45 ? 45 : 60) + '-plain' : 'bb-' + width + '-drop';
      productAliases[id] = target;
    });
  });
  productAliases['uw-60-plain'] = 'uw-60-drop';
  productAliases['uw-60-open'] = 'uw-45-open';
  productAliases['uw-60-hybrid'] = 'uw-120-hybrid';

  const skuFormat = {
    version: 2,
    maxLength: 15,
    description: 'Aile + genişlik (cm) · ön yüz · malzeme. Çift malzeme harfinde ilk harf gövdeyi, ikinci harf kapağı belirtir.',
    patterns: { BB: 'BB60-PL-NC', UW: 'UW60-DP-NC', vertical: 'UW36-VT-NC', open: 'BB45-OP-N', ST: 'ST180-N', WS: 'WS120-N' },
    finishLegend: finishes.map(function (f) { return { id: f.id, code: f.skuCode, name: f.name }; }),
    frontLegend: Object.keys(frontCodes).map(function (id) { return { id: id, code: frontCodes[id], name: frontNames[id] }; }),
    notes: 'Kapaksız ve flüt cam kapaklı modüller tek gövde harfi kullanır. Cam çerçevesi gövdeyle aynı renktedir. Adapte edilebilir tabla tek tabla malzemesi harfi kullanır. 50 / 60 cm gövdeye uygun base ve tabla varyantlarında -H50 / -H60 eki bulunur; 40 cm kodları değişmez.'
  };
  function resolveProduct(product) {
    let id = typeof product === 'string' ? product : product && product.id;
    if (!id && product && product.family) id = product.family === 'BB' || product.family === 'UW' ? product.family.toLowerCase() + '-' + product.width + '-' + product.front : product.family.toLowerCase() + '-' + product.width;
    id = productAliases[id] || id;
    const item = products.find(function (p) { return p.id === id; });
    if (!item || !families[item.family]) throw new Error('Geçersiz modül');
    return item;
  }
  function resolveFinish(value) {
    let id = value && typeof value === 'object' ? value.id : value || 'oak';
    id = finishAliases[id] || id;
    const selectedFinish = finishes.find(function (f) { return f.id === id || f.code === id || f.skuCode === id; });
    if (!selectedFinish) throw new Error('Geçersiz malzeme');
    return selectedFinish;
  }
  function normalizeChannels(channels) {
    if (!channels || typeof channels === 'string' || channels.id) {
      const finish = resolveFinish(channels);
      return { bodyFinish: finish.id, frontFinish: finish.id, spanFinish: finish.id };
    }
    const body = resolveFinish(channels.bodyFinish || channels.finish || channels.spanFinish || 'oak');
    const result = {
      bodyFinish: body.id,
      frontFinish: resolveFinish(channels.frontFinish || body.id).id,
      spanFinish: resolveFinish(channels.spanFinish || body.id).id
    };
    // Explicit selections choose the common wood tone before defaults do.
    // This lets a sparse span-only request select dark wood without an
    // unrequested default oak body overriding it.
    const selectedWood = ['bodyFinish','frontFinish','spanFinish']
      .filter(function (key) { return Object.prototype.hasOwnProperty.call(channels, key) && channels[key]; })
      .map(function (key) { return resolveFinish(channels[key]); })
      .find(function (finish) { return finish.kind === 'veneer'; });
    if (selectedWood) Object.keys(result).forEach(function (key) {
      if (resolveFinish(result[key]).kind === 'veneer') result[key] = selectedWood.id;
    });
    result.spanFinish = result.bodyFinish;
    return result;
  }
  // Editorial card choices keep body and adaptable top together. Transparent
  // glass, open modules and single-surface products have no second finish.
  function cardVariants(product) {
    const item = resolveProduct(product);
    const variants = finishes.map(function (finish) {
      return { id: finish.id, bodyFinish: finish.id, frontFinish: finish.id, spanFinish: finish.id, label: finish.name, ariaLabel: finish.name, dual: false };
    });
    if (!['BB','UW'].includes(item.family) || !['plain','drop','drawers','deep-drawer','hybrid','vertical'].includes(item.front)) return variants;
    [['oak','cream'],['oak','olive'],['dark-oak','cream'],['dark-oak','olive'],['black-oak','cream'],['oak','light-grey'],['dark-oak','light-grey'],['black-oak','light-grey'],['cream','light-grey'],['oak','burgundy'],['dark-oak','burgundy'],['cream','burgundy'],['light-grey','burgundy'],['burgundy','cream']].forEach(function (pair) {
      const body = resolveFinish(pair[0]), front = resolveFinish(pair[1]);
      variants.push({ id: body.id + '--' + front.id, bodyFinish: body.id, frontFinish: front.id, spanFinish: body.id, label: body.name + ' / ' + front.name, ariaLabel: 'Gövde ' + body.name + ', kapak ' + front.name, dual: true });
    });
    return variants;
  }
  function sku(product, channels) {
    const item = resolveProduct(product), selected = normalizeChannels(channels);
    const body = resolveFinish(selected.bodyFinish), frontFinish = resolveFinish(selected.frontFinish), span = resolveFinish(selected.spanFinish);
    const model = item.family + String(item.width), height = selectedBodyHeight(channels);
    const heightSuffix = ['BB','ST'].includes(item.family) && height !== 40 ? '-H' + height : '';
    if (item.family === 'ST') return model + '-' + span.skuCode + heightSuffix;
    if (item.family === 'WS') return model + '-' + body.skuCode;
    const material = body.skuCode + (['open','fluted-glass','vertical-glass'].includes(item.front) ? '' : frontFinish.skuCode);
    return [model, frontCodes[item.front], material].join('-') + heightSuffix;
  }

  // Height is an independent variant, not a material channel. Keep it out of
  // normalizeChannels so finish loops continue to contain only finish values.
  const heightOptions = [40,50,60];
  function selectedBodyHeight(channels) {
    const value = channels && typeof channels === 'object' ? channels.bodyHeight : undefined;
    if (global.AdopConfig && typeof global.AdopConfig.normalizeBodyHeight === 'function') return global.AdopConfig.normalizeBodyHeight(value);
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    return heightOptions.includes(number) ? number : 40;
  }
  function dimensions(product, channels) {
    const item = resolveProduct(product), height = selectedBodyHeight(channels);
    return { width: item.width, depth: item.depth, height: item.family === 'BB' ? height : item.family === 'ST' ? height + 10.5 : item.height };
  }

  const priceNotes = '8.990 TL bazından türetilmiş önerilen satış fiyatları; maliyet/onay henüz yok.';
  const pricing = {
    currency: 'TRY', status: 'proposed', notes: priceNotes,
    baseProduct: 'bb-45-plain', basePrice: 8990,
    weights: { body: .55, front: .25, mechanism: .20 },
    baseBox: { 45: 8990, 60: 10990, 90: 14990, 120: 18990 },
    frontMultipliers: { drop: 1, plain: 1, open: .82, drawers: 1.25, hybrid: 1.12, 'deep-drawer': 1.18, 'fluted-glass': 1.38 },
    span: { 120: 12990, 180: 15990 },
    // The vertical front is 1.5 times the 60 × 36 cm drop front area;
    // 9,990 × 1.5 rounds to a proposed natural-oak price of 14,990 TL.
    upper: { drop: 9990, plain: 9990, open: 6990, hybrid: 13990, vertical: 14990, 'fluted-glass': 13990, 'vertical-glass': 19990 },
    shelf: { 60: 3990, 90: 4990, 120: 6990 }
  };
  function retailRound(value) {
    return Math.max(990, Math.round((value + 10) / 1000) * 1000 - 10);
  }
  function baseBoxPrice(width) {
    if (pricing.baseBox[width]) return pricing.baseBox[width];
    // Saved 70 cm prototypes remain readable without adding 70 cm to the catalogue.
    const widths = Object.keys(pricing.baseBox).map(Number).sort(function (a, b) { return a - b; });
    const upper = widths.find(function (w) { return w > width; });
    const lower = widths.slice().reverse().find(function (w) { return w < width; });
    if (lower && upper) return pricing.baseBox[lower] + (pricing.baseBox[upper] - pricing.baseBox[lower]) * (width - lower) / (upper - lower);
    return null;
  }
  function price(product, channels) {
    const item = resolveProduct(product);
    if (!item.configurable) return null;
    if (['BB','ST'].includes(item.family) && selectedBodyHeight(channels) !== 40) return null;
    const selected = normalizeChannels(channels);
    const body = resolveFinish(selected.bodyFinish), front = resolveFinish(selected.frontFinish), span = resolveFinish(selected.spanFinish);
    // Open modules have no manufactured front; their internal dividers share
    // the body finish, independent of another module's selected door material.
    const frontPremium = ['open','fluted-glass','vertical-glass'].includes(item.front) ? body.premium : front.premium;
    const mixedMaterial = pricing.weights.body * body.premium + pricing.weights.front * frontPremium + pricing.weights.mechanism;
    let raw;
    if (item.family === 'BB') raw = baseBoxPrice(item.width) * (pricing.frontMultipliers[item.front] || 1) * mixedMaterial;
    else if (item.family === 'UW') raw = pricing.upper[item.front] * mixedMaterial;
    else if (item.family === 'ST') raw = pricing.span[item.width] * span.premium;
    else if (item.family === 'WS') raw = pricing.shelf[item.width] * body.premium;
    return Number.isFinite(raw) ? retailRound(raw) : null;
  }
  function findProduct(family, width, front) {
    const canonicalFront = family === 'UW' && front === 'plain' ? 'drop' : front;
    const direct = products.find(function (p) {
      return p.family === family && p.width === Number(width) && (canonicalFront === undefined || p.front === canonicalFront);
    });
    if (direct) return direct;
    const id = family.toLowerCase() + '-' + width + (canonicalFront === undefined || canonicalFront === null ? '' : '-' + canonicalFront);
    const target = productAliases[id];
    return target ? products.find(function (p) { return p.id === target; }) || null : null;
  }
  function allowedWidths(front) {
    return products.filter(function (p) { return p.family === 'BB' && p.front === front; }).map(function (p) { return p.width; });
  }

  const materialRules = { maxFinishes: 2, singleWoodTone: true, spanMatchesBody: true, overflowChannel: 'spanFinish', overflowFallback: 'bodyFinish' };
  const api = { families: families, products: products, finishes: finishes, finishAliases: finishAliases, productAliases: productAliases, frontCodes: frontCodes, skuFormat: skuFormat, plannedMaterials: plannedMaterials, sourceNotes: sourceNotes, materialRules: materialRules, sku: sku, price: price, dimensions: dimensions, heightOptions: heightOptions, priceNotes: priceNotes, pricing: pricing, normalizeChannels: normalizeChannels, cardVariants: cardVariants, findProduct: findProduct, resolveProduct: resolveProduct, allowedWidths: allowedWidths };
  global.AdopModules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
