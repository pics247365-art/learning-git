(() => {
  const $ = (id) => document.getElementById(id);
  let host = null;
  let tabId = null;
  let pendingImport = null;

  const get = (keys) => new Promise((r) => chrome.storage.sync.get(keys, r));
  const set = (obj) => new Promise((r) => chrome.storage.sync.set(obj, r));

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab && tab.id;
    try { host = new URL(tab.url).hostname; } catch (e) { host = null; }
    $('host-label').textContent = host || '—';
    $('pick-btn').disabled = !host;
    if (host) await render();
    else showEmpty('This page is not supported', 'Open a regular website to add blocks.');
  }

  function showEmpty(title, sub) {
    $('list').innerHTML = '';
    $('empty').hidden = false;
    $('empty').querySelector('.empty__title').textContent = title;
    $('empty').querySelector('.empty__sub').textContent = sub;
  }

  async function saveBlocks(blocks) {
    await set({ [host]: blocks });
  }

  async function render() {
    const blocks = (await get(host))[host] || [];
    const list = $('list');
    list.innerHTML = '';
    $('empty').hidden = blocks.length > 0;
    if (!blocks.length) showEmpty('No blocks on this site yet', 'Use "Pick a block" to add one.');

    blocks.forEach((b) => list.appendChild(renderBlock(b, blocks)));

    // "new" badge is shown once, then cleared.
    if (blocks.some((b) => b.isNew)) {
      const cleared = blocks.map((b) => ({ ...b, isNew: false }));
      chrome.storage.onChanged.removeListener(onStorage);
      await saveBlocks(cleared);
      chrome.storage.onChanged.addListener(onStorage);
    }
  }

  function renderBlock(b, blocks) {
    const card = el('div', 'block');

    const top = el('div', 'block__top');
    const name = el('div', 'block__name', b.name);
    name.title = 'Click to rename';
    name.addEventListener('click', () => startRename(name, b, blocks));
    top.appendChild(name);
    if (b.isNew) top.appendChild(el('span', 'block__newbadge', 'new'));

    const toggle = el('div', 'toggle');
    toggle.dataset.on = String(!!b.enabled);
    toggle.addEventListener('click', () => {
      b.enabled = !b.enabled;
      saveBlocks(blocks);
    });
    top.appendChild(toggle);

    const sel = el('div', 'block__selector', b.selector);
    sel.title = b.selector;

    const controls = el('div', 'block__controls');
    const del = el('button', 'icon-btn icon-btn--danger', '🗑');
    del.title = 'Delete';
    del.addEventListener('click', () => saveBlocks(blocks.filter((x) => x.id !== b.id)));
    controls.appendChild(del);

    card.append(top, sel, controls);
    return card;
  }

  function startRename(nameEl, b, blocks) {
    nameEl.contentEditable = 'true';
    nameEl.focus();
    document.getSelection().selectAllChildren(nameEl);
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      nameEl.contentEditable = 'false';
      const v = nameEl.textContent.trim();
      if (save && v && v !== b.name) { b.name = v; saveBlocks(blocks); }
      else nameEl.textContent = b.name;
    };
    nameEl.addEventListener('blur', () => finish(true), { once: true });
    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
      if (e.key === 'Escape') { finish(false); nameEl.blur(); }
    });
  }

  function onStorage(changes, area) {
    if (area === 'sync' && host && changes[host]) render();
  }
  chrome.storage.onChanged.addListener(onStorage);

  // ---------- pick ----------

  $('pick-btn').addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'rtla-pick' });
      window.close();
    } catch (e) {
      showEmpty('Cannot pick on this page', 'Reload the page and try again.');
    }
  });

  // ---------- export / import ----------

  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }
  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', () => closeModal(b.dataset.close)));

  function fillDomains(container, data) {
    container.innerHTML = '';
    Object.keys(data).sort().forEach((domain) => {
      const row = el('label', 'modal__row');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.value = domain;
      row.append(cb, el('span', 'modal__row__host', domain),
        el('span', 'modal__row__count', String(data[domain].length)));
      container.appendChild(row);
    });
  }

  const checked = (container) =>
    Array.from(container.querySelectorAll('input:checked')).map((i) => i.value);

  async function allBlocks() {
    const all = await get(null);
    const out = {};
    Object.keys(all).forEach((k) => { if (Array.isArray(all[k]) && all[k].length) out[k] = all[k]; });
    return out;
  }

  $('export-btn').addEventListener('click', async () => {
    const data = await allBlocks();
    if (!Object.keys(data).length) return;
    fillDomains($('export-domains'), data);
    openModal('export-modal');
  });

  $('export-confirm').addEventListener('click', async () => {
    const data = await allBlocks();
    const domains = {};
    checked($('export-domains')).forEach((d) => { domains[d] = data[d]; });
    const blob = new Blob([JSON.stringify({ app: 'rtl-adaptive', version: 1, domains }, null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rtl-adaptive-blocks.json';
    a.click();
    URL.revokeObjectURL(a.href);
    closeModal('export-modal');
  });

  $('import-btn').addEventListener('click', () => $('import-file').click());

  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json || typeof json.domains !== 'object') throw new Error('bad format');
      pendingImport = json.domains;
      fillDomains($('import-domains'), pendingImport);
      openModal('import-modal');
    } catch (err) {
      showEmpty('Invalid file', 'Choose a JSON file exported from RTL Adaptive.');
    }
  });

  $('import-confirm').addEventListener('click', async () => {
    const existing = await allBlocks();
    const update = {};
    checked($('import-domains')).forEach((d) => {
      const merged = (existing[d] || []).slice();
      (pendingImport[d] || []).forEach((b) => {
        if (b && b.selector && !merged.some((m) => m.selector === b.selector)) {
          merged.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: String(b.name || b.selector),
            selector: String(b.selector),
            enabled: b.enabled !== false
          });
        }
      });
      update[d] = merged;
    });
    await set(update);
    pendingImport = null;
    closeModal('import-modal');
  });

  init();
})();
