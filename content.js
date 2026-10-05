(() => {
  if (window.__rtlaLoaded) return;
  window.__rtlaLoaded = true;

  const HOST = location.hostname;
  const HEBREW = /[֐-׿]/;
  const ENGLISH_RUN = /[A-Za-z][A-Za-z0-9]*(?:[ '.\-_\/:@+#&][A-Za-z0-9]+)*/g;
  const ARROWS = { '←': '→', '→': '←', '↔': '↔' };
  const SKIP_TAGS = new Set(['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SELECT']);

  let blocks = [];
  let records = [];
  let observer = null;
  let applyTimer = null;

  // ---------- helpers ----------

  function isProtected(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (SKIP_TAGS.has(n.tagName)) return true;
      if (n.isContentEditable || n.getAttribute('contenteditable') === '' ||
          n.getAttribute('contenteditable') === 'true') return true;
    }
    return false;
  }

  function safeQueryAll(selector) {
    try { return Array.from(document.querySelectorAll(selector)); }
    catch (e) { return []; }
  }

  function toast(msg) {
    let t = document.querySelector('.rtla-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'rtla-toast';
      document.documentElement.appendChild(t);
    }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add('rtla-toast--visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('rtla-toast--visible'), 2200);
  }

  // ---------- transformation engine ----------

  function swapArrows(s) {
    return s.replace(/[←→↔]/g, (c) => ARROWS[c]);
  }

  function transformTextNode(node) {
    const text = node.nodeValue;
    if (!HEBREW.test(text)) return; // numbers / symbols / English only: untouched

    const parent = node.parentElement;
    if (!parent || parent.closest('[data-rtla-ltr]')) return;

    records.push({ type: 'dir', el: parent, dir: parent.getAttribute('dir'), direction: parent.style.direction });
    parent.style.direction = 'rtl';

    const swapped = swapArrows(text);
    const frag = document.createDocumentFragment();
    const created = [];
    let last = 0;
    let m;
    ENGLISH_RUN.lastIndex = 0;
    while ((m = ENGLISH_RUN.exec(swapped))) {
      if (m.index > last) {
        const t = document.createTextNode(swapped.slice(last, m.index));
        frag.appendChild(t); created.push(t);
      }
      const span = document.createElement('span');
      span.setAttribute('dir', 'ltr');
      span.setAttribute('data-rtla-ltr', '');
      span.textContent = m[0];
      frag.appendChild(span); created.push(span);
      last = m.index + m[0].length;
    }
    if (last < swapped.length) {
      const t = document.createTextNode(swapped.slice(last));
      frag.appendChild(t); created.push(t);
    }
    if (!created.length) return;

    node.parentNode.replaceChild(frag, node);
    records.push({ type: 'text', orig: node, created });
  }

  function transformElement(root) {
    if (isProtected(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || isProtected(p)) return NodeFilter.FILTER_REJECT;
        if (p.hasAttribute('data-rtla-ltr')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(transformTextNode);
  }

  function revertAll() {
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      if (r.type === 'text') {
        const first = r.created[0];
        if (first && first.parentNode) {
          first.parentNode.insertBefore(r.orig, first);
          r.created.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
        }
      } else if (r.type === 'dir') {
        r.el.style.direction = r.direction || '';
        if (!r.el.getAttribute('style')) r.el.removeAttribute('style');
      }
    }
    records = [];
  }

  function applyAll() {
    if (observer) observer.disconnect();
    revertAll();
    blocks.filter((b) => b.enabled).forEach((b) => safeQueryAll(b.selector).forEach(transformElement));
    observe();
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyAll, 250);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(scheduleApply);
    if (blocks.some((b) => b.enabled)) {
      observer.observe(document.body || document.documentElement, {
        childList: true, subtree: true, characterData: true
      });
    }
  }

  // ---------- storage ----------

  function load() {
    chrome.storage.sync.get(HOST, (res) => {
      blocks = res[HOST] || [];
      applyAll();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[HOST]) {
      blocks = changes[HOST].newValue || [];
      applyAll();
    }
  });

  // ---------- picker ----------

  let picking = false;
  let hovered = null;

  function cssPath(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) {
        parts.unshift('#' + CSS.escape(n.id));
        break;
      }
      let part = n.tagName.toLowerCase();
      if (n.parentElement) {
        const same = Array.from(n.parentElement.children).filter((c) => c.tagName === n.tagName);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(n) + 1) + ')';
      }
      parts.unshift(part);
    }
    return parts.join(' > ');
  }

  function defaultName(el) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t ? (t.length > 28 ? t.slice(0, 28) + '…' : t) : '<' + el.tagName.toLowerCase() + '>';
  }

  function onOver(e) {
    if (hovered) hovered.classList.remove('rtla-hover');
    hovered = e.target;
    hovered.classList.add('rtla-hover');
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    stopPicking();
    addBlock(el);
  }

  function onKey(e) {
    if (e.key === 'Escape') { stopPicking(); toast('Picker cancelled'); }
  }

  function startPicking() {
    if (picking) return;
    picking = true;
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    toast('Click an element · Esc to cancel');
  }

  function stopPicking() {
    picking = false;
    document.removeEventListener('mouseover', onOver, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (hovered) hovered.classList.remove('rtla-hover');
    hovered = null;
  }

  function addBlock(el) {
    if (isProtected(el)) { toast('Inputs and editable fields are never touched'); return; }

    const selector = cssPath(el);
    chrome.storage.sync.get(HOST, (res) => {
      let list = res[HOST] || [];

      if (list.some((b) => b.selector === selector)) { toast('Block already added'); return; }

      // Already covered by an existing block on an ancestor.
      const covered = list.some((b) => safeQueryAll(b.selector).some((a) => a !== el && a.contains(el)));
      if (covered) { toast('Already covered by a larger block'); return; }

      // Containment: new block is an ancestor of existing blocks -> drop the children.
      const before = list.length;
      list = list.filter((b) => !safeQueryAll(b.selector).some((c) => c !== el && el.contains(c)));
      const removed = before - list.length;

      list.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: defaultName(el),
        selector,
        enabled: true,
        isNew: true
      });
      chrome.storage.sync.set({ [HOST]: list }, () => {
        toast(removed ? 'Block added · ' + removed + ' inner block(s) merged' : 'Block added');
      });
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'rtla-pick') startPicking();
  });

  load();
})();
