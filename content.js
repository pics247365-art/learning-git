// RTL Adaptive — content script injected into every page
(function () {
  'use strict';

  if (window.__rtlaLoaded) return;
  window.__rtlaLoaded = true;

  const host = location.hostname;

  // ── Picker ────────────────────────────────────────────────────────────

  let pickerActive = false;
  let hoveredEl = null;

  function startPicker() {
    pickerActive = true;
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout',  onOut,  true);
    document.addEventListener('click',     onPick, true);
    showToast('לחץ על אלמנט להוספה כבלוק');
  }

  function stopPicker() {
    pickerActive = false;
    document.removeEventListener('mouseover', onOver, true);
    document.removeEventListener('mouseout',  onOut,  true);
    document.removeEventListener('click',     onPick, true);
    if (hoveredEl) { hoveredEl.classList.remove('rtla-hover'); hoveredEl = null; }
  }

  function onOver(e) {
    if (hoveredEl) hoveredEl.classList.remove('rtla-hover');
    hoveredEl = e.target;
    hoveredEl.classList.add('rtla-hover');
  }

  function onOut(e) { e.target.classList.remove('rtla-hover'); }

  function onPick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    el.classList.remove('rtla-hover');
    stopPicker();

    const selector = generateSelector(el);
    chrome.storage.sync.get(host, data => {
      const blocks = data[host] || {};

      // Containment: remove child blocks when a parent is added
      for (const existing of Object.keys(blocks)) {
        try {
          const existingEl = document.querySelector(existing);
          if (existingEl && el.contains(existingEl)) delete blocks[existing];
        } catch {}
      }

      blocks[selector] = { name: selectorToName(selector), enabled: true, isNew: true };
      chrome.storage.sync.set({ [host]: blocks }, () => {
        applyRTL(blocks);
        showToast('בלוק נוסף ✓');
      });
    });
  }

  // ── Selector generation ───────────────────────────────────────────────

  function generateSelector(el) {
    if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
      return '#' + CSS.escape(el.id);
    }

    const parts = [];
    let node = el;
    while (node && node !== document.body) {
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        break;
      }
      let part = node.tagName.toLowerCase();
      const cls = [...node.classList].find(c => !c.startsWith('rtla-'));
      if (cls) part += '.' + CSS.escape(cls);
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === node.tagName);
        if (siblings.length > 1) part += `:nth-child(${[...parent.children].indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      if (parts.length > 1 && document.querySelectorAll(parts.join(' > ')).length === 1) break;
    }
    return parts.join(' > ');
  }

  function selectorToName(sel) {
    return sel.match(/#([a-z0-9_-]+)/i)?.[1]
        || sel.match(/\.([a-z0-9_-]+)/i)?.[1]
        || sel.match(/^[a-z]+/i)?.[0]
        || sel.slice(0, 24);
  }

  // ── RTL transformation ────────────────────────────────────────────────

  const HEBREW     = /[א-תיִ-פֿ]/;
  const ONLY_MISC  = /^[\d\s\W]+$/;
  const ARROWS     = /[←→]/g;
  const ENG_RUN    = /([A-Za-z][A-Za-z0-9 ,.'"\-]*)/g;
  const EDITABLE   = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  function applyRTL(blocks) {
    for (const [selector, block] of Object.entries(blocks)) {
      if (block.enabled === false) continue;
      try {
        document.querySelectorAll(selector).forEach(transformElement);
      } catch {}
    }
  }

  function transformElement(el) {
    if (EDITABLE.has(el.tagName) || el.isContentEditable) return;
    el.style.direction = 'rtl';

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || EDITABLE.has(p.tagName) || p.isContentEditable) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    for (const tn of textNodes) {
      const text = tn.textContent;
      if (ONLY_MISC.test(text) || !HEBREW.test(text)) continue;

      const flipped = text.replace(ARROWS, c => c === '←' ? '→' : '←');
      ENG_RUN.lastIndex = 0;
      const wrapped = ENG_RUN.test(flipped)
        ? flipped.replace(ENG_RUN, '<span dir="ltr">$1</span>')
        : flipped;

      if (wrapped !== text) {
        const span = document.createElement('span');
        span.innerHTML = wrapped;
        tn.parentNode.replaceChild(span, tn);
      } else if (flipped !== text) {
        tn.textContent = flipped;
      }
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────

  let toastEl = null;
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'rtla-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('rtla-toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('rtla-toast--visible'), 2400);
  }

  // ── Messages ──────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === 'START_PICK') { startPicker(); respond({ ok: true }); }
    if (msg.type === 'STOP_PICK')  { stopPicker();  respond({ ok: true }); }
    if (msg.type === 'REAPPLY') {
      chrome.storage.sync.get(host, data => applyRTL(data[host] || {}));
      respond({ ok: true });
    }
  });

  // ── Init & live reapply ───────────────────────────────────────────────

  function load() {
    chrome.storage.sync.get(host, data => applyRTL(data[host] || {}));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', load)
    : load();

  let debounce = null;
  new MutationObserver(() => {
    if (pickerActive) return;
    clearTimeout(debounce);
    debounce = setTimeout(load, 400);
  }).observe(document.body, { childList: true, subtree: true });

})();
