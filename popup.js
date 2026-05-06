// RTL Adaptive — popup logic
'use strict';

let currentHost = '';
let pendingImport = null;

// ── Init ──────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  try { currentHost = new URL(tab.url).hostname; } catch { return; }

  document.getElementById('host-label').textContent = currentHost;
  await renderBlocks();
  bindActions(tab.id);
}

// ── Render block list ─────────────────────────────────────────────────

async function renderBlocks() {
  const data   = await chrome.storage.sync.get(currentHost);
  const blocks = data[currentHost] || {};
  const list   = document.getElementById('list');
  const empty  = document.getElementById('empty');
  const keys   = Object.keys(blocks);

  list.innerHTML = '';
  list.hidden    = keys.length === 0;
  empty.hidden   = keys.length > 0;

  for (const sel of keys) list.appendChild(makeBlockEl(sel, blocks[sel]));
}

function makeBlockEl(selector, block) {
  const el = document.createElement('div');
  el.className = 'block';

  el.innerHTML = `
    <div class="block__top">
      <div class="block__name" contenteditable="false" spellcheck="false">${esc(block.name || selector)}</div>
      ${block.isNew ? '<span class="block__newbadge">New</span>' : ''}
    </div>
    <div class="block__selector">${esc(selector)}</div>
    <div class="block__controls">
      <button class="icon-btn" data-action="rename" title="Rename">✏️</button>
      <button class="icon-btn icon-btn--danger" data-action="delete" title="Delete">🗑</button>
      <div class="toggle" data-on="${block.enabled !== false}" title="Toggle RTL"></div>
    </div>`;

  if (block.isNew) clearNewBadge(selector);

  const nameEl   = el.querySelector('.block__name');
  const toggleEl = el.querySelector('.toggle');

  // Rename
  el.querySelector('[data-action="rename"]').onclick = () => {
    nameEl.contentEditable = 'true';
    nameEl.focus();
    selectAll(nameEl);
    nameEl.onblur = async () => {
      nameEl.contentEditable = 'false';
      await patchBlock(selector, { name: nameEl.textContent.trim() || selector });
    };
    nameEl.onkeydown = e => {
      if (e.key === 'Enter')  { e.preventDefault(); nameEl.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); nameEl.textContent = block.name || selector; nameEl.blur(); }
    };
  };

  // Delete
  el.querySelector('[data-action="delete"]').onclick = async () => {
    await removeBlock(selector);
    await renderBlocks();
    reapply();
  };

  // Toggle
  toggleEl.onclick = async () => {
    const on = toggleEl.dataset.on !== 'true';
    toggleEl.dataset.on = String(on);
    await patchBlock(selector, { enabled: on });
    reapply();
  };

  return el;
}

// ── Storage helpers ───────────────────────────────────────────────────

async function patchBlock(selector, patch) {
  const data   = await chrome.storage.sync.get(currentHost);
  const blocks = data[currentHost] || {};
  if (blocks[selector]) Object.assign(blocks[selector], patch);
  await chrome.storage.sync.set({ [currentHost]: blocks });
}

async function removeBlock(selector) {
  const data   = await chrome.storage.sync.get(currentHost);
  const blocks = data[currentHost] || {};
  delete blocks[selector];
  await chrome.storage.sync.set({ [currentHost]: blocks });
}

async function clearNewBadge(selector) {
  await patchBlock(selector, { isNew: false });
}

// ── Notify content script to reapply ─────────────────────────────────

async function reapply() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'REAPPLY' }).catch(() => {});
}

// ── Actions ───────────────────────────────────────────────────────────

function bindActions(tabId) {
  // Pick a block
  document.getElementById('pick-btn').onclick = async () => {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'START_PICK' });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
      await chrome.tabs.sendMessage(tabId, { type: 'START_PICK' });
    }
    window.close();
  };

  // Export
  document.getElementById('export-btn').onclick = async () => {
    const all   = await chrome.storage.sync.get(null);
    const hosts = Object.keys(all).filter(k => all[k] && typeof all[k] === 'object' && !Array.isArray(all[k]));
    renderDomainList('export-domains', hosts, all);
    document.getElementById('export-modal').hidden = false;
  };

  document.getElementById('export-confirm').onclick = async () => {
    const all     = await chrome.storage.sync.get(null);
    const checked = checkedValues('#export-domains');
    const out     = Object.fromEntries(checked.map(h => [h, all[h]]));
    downloadJSON(out, 'rtl-adaptive-blocks.json');
    document.getElementById('export-modal').hidden = true;
  };

  // Import
  document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();

  document.getElementById('import-file').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pendingImport = JSON.parse(await file.text());
      const hosts  = Object.keys(pendingImport).filter(k => pendingImport[k] && typeof pendingImport[k] === 'object');
      renderDomainList('import-domains', hosts, pendingImport);
      document.getElementById('import-modal').hidden = false;
    } catch { alert('קובץ JSON לא תקין'); }
    e.target.value = '';
  };

  document.getElementById('import-confirm').onclick = async () => {
    const checked  = checkedValues('#import-domains');
    const existing = await chrome.storage.sync.get(null);
    const merged   = {};
    for (const h of checked) merged[h] = { ...(existing[h] || {}), ...pendingImport[h] };
    await chrome.storage.sync.set(merged);
    document.getElementById('import-modal').hidden = true;
    await renderBlocks();
    reapply();
  };

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => { document.getElementById(btn.dataset.close).hidden = true; };
  });
}

// ── UI helpers ────────────────────────────────────────────────────────

function renderDomainList(containerId, hosts, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (const host of hosts) {
    const count = Object.keys(data[host] || {}).length;
    const row   = document.createElement('label');
    row.className = 'modal__row';
    row.innerHTML = `
      <input type="checkbox" checked value="${esc(host)}">
      <span class="modal__row__host">${esc(host)}</span>
      <span class="modal__row__count">${count} block${count !== 1 ? 's' : ''}</span>`;
    container.appendChild(row);
  }
}

function checkedValues(selector) {
  return [...document.querySelectorAll(selector + ' input:checked')].map(el => el.value);
}

function downloadJSON(obj, filename) {
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function selectAll(el) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

init();
