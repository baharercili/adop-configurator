(function () {
  'use strict';

  const data = window.AdopInspiration;
  const grid = document.getElementById('inspiration-grid');
  if (!grid) return;

  const form = document.getElementById('inspiration-filters');
  const results = document.getElementById('inspiration-results');
  const total = document.getElementById('inspiration-total');
  const reset = document.getElementById('inspiration-reset');
  const empty = document.getElementById('inspiration-empty');
  const moreArea = document.getElementById('inspiration-more-area');
  const more = document.getElementById('inspiration-more');
  const progress = document.getElementById('inspiration-progress');
  const viewer = document.getElementById('inspiration-viewer');
  const viewerImage = document.getElementById('inspiration-viewer-image');
  const previous = document.getElementById('inspiration-prev');
  const next = document.getElementById('inspiration-next');
  const close = document.getElementById('inspiration-close');
  const design = document.getElementById('inspiration-design');
  const controls = ['finish', 'palette', 'span', 'width'].map(key => [key, document.getElementById('inspiration-' + key)]);
  const batchSize = 24;
  const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
  const source = document.querySelector('script[data-inspiration-source]');
  const assetBase = new URL('.', source?.src || document.currentScript?.src || location.href);
  const finishes = new Map((data?.finishes || []).map(finish => [finish.id, finish]));
  let filtered = [];
  let shown = batchSize;
  let activeIndex = -1;
  let opener = null;

  if (!data?.items?.length) {
    total.textContent = '';
    form.hidden = true;
    results.textContent = 'Düzenler şu anda yüklenemedi. Sayfayı yenileyerek tekrar deneyebilirsin.';
    return;
  }

  // Alternate the two palettes so the opening selection represents both.
  const mono = data.items.filter(item => item.mono);
  const duo = data.items.filter(item => !item.mono);
  if (data.version >= 2) {
    mono.sort((a, b) => Number(b.id) - Number(a.id));
    duo.sort((a, b) => Number(b.id) - Number(a.id));
  }
  const items = [];
  for (let i = 0; i < Math.max(mono.length, duo.length); i += 1) {
    if (mono[i]) items.push(mono[i]);
    if (duo[i]) items.push(duo[i]);
  }

  for (const finish of finishes.values()) {
    const option = document.createElement('option');
    option.value = finish.id;
    option.textContent = finish.name;
    controls[0][1].append(option);
  }
  total.textContent = number.format(items.length) + ' düzen';

  function finishName(id) { return finishes.get(id)?.name || id || ''; }
  function imageURL(path) { return new URL(path, assetBase).href; }
  function widthLabel(item) { return number.format(item.width) + ' cm'; }
  function finishLabel(item) {
    return item.bodyFinish === item.frontFinish
      ? finishName(item.bodyFinish)
      : finishName(item.bodyFinish) + ' / ' + finishName(item.frontFinish);
  }
  function swatch(id) {
    const dot = document.createElement('i');
    dot.style.setProperty('--finish-color', finishes.get(id)?.color || '#c2b99f');
    return dot;
  }
  function selectedFilters() {
    return Object.fromEntries(controls.map(([key, control]) => [key, control.value]));
  }
  function widthMatches(width, range) {
    if (range === 'to180') return width <= 180;
    if (range === '180to240') return width > 180 && width <= 240;
    if (range === '240to300') return width > 240 && width <= 300;
    if (range === 'over300') return width > 300;
    return true;
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    for (const [key, control] of controls) {
      const value = params.get(key) || '';
      control.value = Array.from(control.options).some(option => option.value === value) ? value : '';
    }
    const amount = Number(params.get('shown'));
    shown = Number.isSafeInteger(amount) && amount > batchSize ? Math.min(amount, items.length) : batchSize;
  }
  function writeURL() {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(selectedFilters())) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (shown > batchSize) url.searchParams.set('shown', String(shown));
    else url.searchParams.delete('shown');
    if (url.href !== location.href) history.pushState(null, '', url.pathname + url.search + url.hash);
  }
  function card(item) {
    const article = document.createElement('article');
    article.className = 'inspiration-card';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inspiration-card-button';
    button.dataset.inspirationId = item.id;
    button.setAttribute('aria-label', item.title + ', ' + widthLabel(item) + ', ' + finishLabel(item) + '. Görseli büyüt');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'inspiration-viewer');

    const picture = document.createElement('span');
    picture.className = 'inspiration-card-image';
    const img = document.createElement('img');
    img.src = imageURL(item.src);
    img.srcset = imageURL(item.src) + ' 480w, ' + imageURL(item.medium || item.src) + ' 800w';
    img.sizes = '(max-width:650px) calc(100vw - 40px), (max-width:900px) calc((100vw - 68px) / 2), (min-width:1680px) 504px, calc((100vw - 104px - 52px) / 3)';
    img.width = 480;
    img.height = 600;
    img.alt = item.alt || item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    const expand = document.createElement('span');
    expand.className = 'inspiration-card-open';
    expand.setAttribute('aria-hidden', 'true');
    expand.textContent = '↗';
    picture.append(img, expand);

    const caption = document.createElement('span');
    caption.className = 'inspiration-card-caption';
    const width = document.createElement('span');
    width.className = 'inspiration-card-width';
    width.textContent = widthLabel(item);
    const index = document.createElement('span');
    index.className = 'inspiration-card-number';
    index.textContent = String(item.id).padStart(3, '0');
    const material = document.createElement('span');
    material.className = 'inspiration-card-material';
    const swatches = document.createElement('span');
    swatches.className = 'inspiration-mini-swatches';
    swatches.setAttribute('aria-hidden', 'true');
    swatches.append(swatch(item.bodyFinish));
    if (item.bodyFinish !== item.frontFinish) swatches.append(swatch(item.frontFinish));
    const materialText = document.createElement('span');
    materialText.textContent = finishLabel(item);
    material.append(swatches, materialText);
    caption.append(width, index, material);
    button.append(picture, caption);
    article.append(button);
    return article;
  }
  function renderCards(appendOnly) {
    const start = appendOnly ? grid.childElementCount : 0;
    if (!appendOnly) grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const item of filtered.slice(start, shown)) fragment.append(card(item));
    grid.append(fragment);
    const visible = Math.min(shown, filtered.length);
    moreArea.hidden = !filtered.length;
    more.hidden = visible >= filtered.length;
    progress.textContent = number.format(visible) + ' / ' + number.format(filtered.length) + ' düzen';
  }
  function applyFilters() {
    const values = selectedFilters();
    filtered = items.filter(item =>
      (!values.finish || item.bodyFinish === values.finish || item.frontFinish === values.finish) &&
      (!values.palette || (values.palette === 'mono' ? item.mono : !item.mono)) &&
      (!values.span || item.span === (values.span === 'yes')) &&
      widthMatches(Number(item.width), values.width)
    );
    const active = Object.values(values).some(Boolean);
    reset.hidden = !active;
    for (const [, control] of controls) control.dataset.active = String(Boolean(control.value));
    empty.hidden = filtered.length > 0;
    results.textContent = active ? number.format(filtered.length) + ' düzen' : 'Tüm düzenler';
    renderCards(false);
  }
  function resetFilters() {
    for (const [, control] of controls) control.value = '';
    shown = batchSize;
    writeURL();
    applyFilters();
    controls[0][1].focus({ preventScroll: true });
  }
  function finishRow(label, id) {
    const row = document.createElement('div');
    row.className = 'inspiration-viewer-finish';
    const dot = swatch(id);
    dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('dt');
    name.textContent = label;
    const value = document.createElement('dd');
    value.textContent = finishName(id);
    row.append(dot, name, value);
    return row;
  }
  function updateViewer(index) {
    const item = filtered[index];
    if (!item) return;
    activeIndex = index;
    viewerImage.alt = item.alt || item.title;
    viewerImage.src = imageURL(item.full || item.medium || item.src);
    document.getElementById('inspiration-viewer-title').textContent = item.title;
    document.getElementById('inspiration-viewer-number').textContent = 'Düzen ' + String(item.id).padStart(3, '0');
    document.getElementById('inspiration-viewer-width').textContent = widthLabel(item) + ' · ' + (item.span ? 'Tablalı' : 'Tablasız');
    document.getElementById('inspiration-viewer-count').textContent = number.format(index + 1) + ' / ' + number.format(filtered.length);
    const material = document.getElementById('inspiration-viewer-finishes');
    material.replaceChildren();
    if (item.bodyFinish === item.frontFinish) material.append(finishRow('Gövde ve kapak', item.bodyFinish));
    else material.append(finishRow('Gövde', item.bodyFinish), finishRow('Kapak', item.frontFinish));
    const target = new URL(document.body.dataset.designBase || 'index.html', location.href);
    target.searchParams.set('inspiration', item.id);
    design.href = target.href;
    previous.disabled = index === 0;
    next.disabled = index === filtered.length - 1;
    if (document.activeElement === previous && previous.disabled) (next.disabled ? close : next).focus({ preventScroll: true });
    if (document.activeElement === next && next.disabled) (previous.disabled ? close : previous).focus({ preventScroll: true });
  }
  function openViewer(id, trigger) {
    const index = filtered.findIndex(item => item.id === id);
    if (index < 0) return;
    opener = trigger;
    updateViewer(index);
    viewer.showModal();
    close.focus({ preventScroll: true });
  }
  function closeViewer() { if (viewer.open) viewer.close(); }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', () => {
    shown = batchSize;
    writeURL();
    applyFilters();
  });
  form.addEventListener('reset', event => { event.preventDefault(); resetFilters(); });
  document.getElementById('inspiration-empty-reset').addEventListener('click', resetFilters);
  more.addEventListener('click', () => {
    const firstNewIndex = grid.childElementCount;
    shown = Math.min(shown + batchSize, filtered.length);
    renderCards(true);
    writeURL();
    results.textContent = number.format(Math.min(shown, filtered.length)) + ' / ' + number.format(filtered.length) + ' düzen gösteriliyor';
    if (more.hidden) grid.children[firstNewIndex]?.querySelector('button')?.focus({ preventScroll: true });
  });
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-inspiration-id]');
    if (button) openViewer(button.dataset.inspirationId, button);
  });
  previous.addEventListener('click', () => updateViewer(activeIndex - 1));
  next.addEventListener('click', () => updateViewer(activeIndex + 1));
  close.addEventListener('click', closeViewer);
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeViewer();
  });
  viewer.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      updateViewer(activeIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  viewer.addEventListener('close', () => {
    viewerImage.removeAttribute('src');
    activeIndex = -1;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  window.addEventListener('popstate', () => {
    closeViewer();
    readURL();
    applyFilters();
  });

  readURL();
  applyFilters();
})();
