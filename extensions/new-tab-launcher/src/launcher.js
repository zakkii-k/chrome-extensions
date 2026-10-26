(() => {
  const stateKey = '__newTabLauncherV2';
  if (globalThis[stateKey]) { globalThis[stateKey](); return; }
  const embedded = document.documentElement.hasAttribute('data-launcher-frame') && location.protocol === 'chrome-extension:' && window.parent !== window;
  const popup = (document.documentElement.hasAttribute('data-launcher-popup') || embedded) && location.protocol === 'chrome-extension:';
  const parameters = new URLSearchParams(location.hash.slice(1));
  const token = parameters.get('token');
  const parentOrigin = parameters.get('parentOrigin');
  const notify = message => {
    if (embedded && token && /^https?:\/\//.test(parentOrigin || '')) window.parent.postMessage({...message,token},parentOrigin);
  };
  const previousFocus = document.activeElement;
  const host = document.createElement('div');
  host.style.cssText = embedded ? 'all:initial!important;display:block!important;' : 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const newTabIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
  const tabIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/></svg>';
  shadow.innerHTML = `
    <style>
      :host { color-scheme:light; }
      * { box-sizing:border-box; }
      .backdrop { position:fixed; inset:0; display:flex; align-items:flex-start; justify-content:center;
        padding: min(26vh,220px) 24px 24px; background:rgb(20 25 35 / .12);
        font:400 16px/1.45 'Segoe UI','Yu Gothic UI',system-ui,sans-serif; color:#23252a; }
      .panel { width:min(720px,100%); max-height:calc(100dvh - min(26vh,220px) - 24px); overflow:auto;
        border:1px solid #e6e7e9; border-radius:16px; background:#fff; box-shadow:0 18px 60px #0003,0 3px 12px #0001; }
      form { margin:0; }
      .input-row { display:flex; align-items:center; gap:16px; padding:22px 24px; }
      svg { width:22px; height:22px; flex-shrink:0; }
      .input-row svg { color:#6b6e76; }
      input { min-width:0; width:100%; padding:0; border:0; outline:0; border-radius:0; background:transparent;
        color:#23252a; font:400 21px/1.45 'Segoe UI','Yu Gothic UI',system-ui,sans-serif; caret-color:#356bc5; }
      input::placeholder { color:#92969e; }
      .results { border-top:1px solid #f0f1f3; padding:6px 8px 8px; }
      .results:empty { display:none; }
      .option { width:100%; display:flex; align-items:center; gap:16px; padding:13px 16px; border-radius:9px;
        cursor:pointer; user-select:none; color:#363941; }
      .option[aria-selected=true] { background:#e9f1ff; color:#245fa8; }
      .option .copy { flex:1; min-width:0; }
      .title { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
      .domain { color:#868b94; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px; }
      .initial { width:24px; height:24px; display:grid; place-items:center; flex-shrink:0; border-radius:6px;
        background:#f1f2f5; color:#555b68; font-size:15px; font-weight:600; }
      .trailing { width:19px; height:19px; color:#8b929c; }
      .option[aria-selected=true] .trailing { color:#387bcc; }
      .error { margin:0; padding:0 24px 18px; color:#b34747; font-size:13px; }
      .error:empty { display:none; }
      .popup { position:relative; padding:0; background:transparent; }
      .popup .panel { width:100%; border:0; border-radius:0; max-height:580px; box-shadow:none; overscroll-behavior:contain; }
      .embedded .panel { max-height:100vh; }
      @media (max-width:480px) { .backdrop:not(.popup) { padding:18vh 14px 14px; } .input-row { padding:19px; gap:12px; }
        input { font-size:19px; } .option { padding:12px 11px; gap:12px; } .panel { max-height:76vh; } }
    </style>
    <div class="backdrop ${popup ? 'popup' : ''} ${embedded ? 'embedded' : ''}">
      <section class="panel" role="dialog" aria-modal="true" aria-label="検索">
        <form><div class="input-row">${searchIcon}<input type="text" role="combobox" aria-label="検索またはURL" aria-autocomplete="list" aria-controls="suggestions" aria-expanded="false" placeholder="検索、またはURL" autocomplete="off" spellcheck="false"></div></form>
        <div id="suggestions" class="results" role="listbox" aria-label="候補"></div>
        <p class="error" role="alert"></p>
      </section>
    </div>`;
  const input = shadow.querySelector('input');
  const list = shadow.querySelector('.results');
  const error = shadow.querySelector('.error');
  let items = [];
  let selected = 0;
  let pending = false;
  let composing = false;
  let timer;
  let revision = 0;
  let closed = false;
  let escapePending = false;
  let resizeObserver;
  let lastHeight = 0;
  function reportSize() {
    if (!embedded || closed) return;
    const height = Math.min(580, Math.max(74, shadow.querySelector('.panel').scrollHeight));
    if (height !== lastHeight) {lastHeight = height;notify({type:'launcher:size',height});}
  }
  const itemKey = item => item?.kind === 'tab' ? `tab:${item.id}` : `search:${item?.text}`;
  const close = () => {
    closed = true;
    revision++;
    clearTimeout(timer);
    resizeObserver?.disconnect();
    if (embedded) {notify({type:'launcher:close'});return;}
    if (popup) { window.close(); return; }
    host.remove();
    delete globalThis[stateKey];
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  globalThis[stateKey] = close;
  function select(index) {
    selected = index;
    [...list.children].forEach((row, i) => row.setAttribute('aria-selected', String(i === selected)));
    const row = list.children[selected];
    if (row) {
      input.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView({ block:'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function render(candidates, preserve = false) {
    if (closed) return;
    const oldKey = preserve ? itemKey(items[selected]) : null;
    const text = input.value.trim();
    items = [...(text ? [{kind:'search',text}] : []), ...candidates];
    selected = Math.max(0, oldKey ? items.findIndex(item => itemKey(item) === oldKey) : 0);
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'option';
      row.id = `candidate-${index}`;
      row.setAttribute('role','option');
      row.setAttribute('aria-selected',String(index === selected));
      const icon = document.createElement('span');
      if (item.kind === 'tab') {
        icon.className = 'initial';
        icon.textContent = (item.title || '?').slice(0,1).toUpperCase();
      } else icon.innerHTML = searchIcon;
      const copy = document.createElement('div');
      copy.className = 'copy';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.kind === 'tab' ? item.title : item.text;
      copy.append(title);
      if (item.kind === 'tab') {
        const domain = document.createElement('div');
        domain.className = 'domain';
        try { domain.textContent = new URL(item.url).hostname; } catch { domain.textContent = ''; }
        copy.append(domain);
      }
      const trailing = document.createElement('span');
      trailing.innerHTML = item.kind === 'tab' ? tabIcon : newTabIcon;
      trailing.querySelector('svg').classList.add('trailing');
      row.append(icon,copy,trailing);
      row.addEventListener('pointermove', () => select(index));
      row.addEventListener('pointerdown', event => event.preventDefault());
      row.addEventListener('click', () => { select(index); submit(); });
      list.append(row);
    });
    input.setAttribute('aria-expanded',String(items.length > 0));
    if (items[selected]) input.setAttribute('aria-activedescendant',`candidate-${selected}`);
    else input.removeAttribute('aria-activedescendant');
    reportSize();
  }
  function refresh() {
    clearTimeout(timer);
    const version = ++revision;
    render([]);
    if (composing) return;
    const text = input.value;
    timer = setTimeout(async () => {
      try {
        const result = await chrome.runtime.sendMessage({ type:'launcher:suggest',text });
        if (!closed && version === revision && result?.ok) render(result.items || [],true);
      } catch { /* Search still works without suggestions. */ }
    }, text ? 180 : 0);
  }
  async function submit() {
    if (pending || composing) return;
    const item = items[selected] || (input.value.trim() ? {kind:'search',text:input.value.trim()} : null);
    if (!item) return;
    pending = true;
    input.readOnly = true;
    error.textContent = '';
    const message = item.kind === 'tab' ? {type:'launcher:switch',id:item.id} : {type:'launcher:submit',text:item.text};
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (!response?.ok) throw new Error(response?.error || '開き直してください。');
      close();
    } catch (cause) {
      if (closed) return;
      error.textContent = cause.message;
      reportSize();
      pending = false;
      input.readOnly = false;
      input.focus();
    }
  }
  shadow.querySelector('.backdrop').addEventListener('click',event => {
    if (event.target.classList.contains('backdrop')) close();
  });
  shadow.addEventListener('keydown',event => {
    event.stopPropagation();
    if (event.isComposing || composing || event.keyCode === 229) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); if (embedded) escapePending = true; else close(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length) select((selected + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    }
    if (event.key === 'Enter') { event.preventDefault(); submit(); }
    if (event.key === 'Tab') { event.preventDefault(); input.focus(); }
  });
  shadow.addEventListener('keyup',event => {
    event.stopPropagation();
    if (event.key === 'Escape' && escapePending) {event.preventDefault();escapePending = false;close();}
  });
  input.addEventListener('input',refresh);
  input.addEventListener('compositionstart', () => { composing = true; revision++; clearTimeout(timer); });
  input.addEventListener('compositionend', () => { composing = false; refresh(); });
  shadow.querySelector('form').addEventListener('submit',event => { event.preventDefault(); submit(); });
  (document.body || document.documentElement).append(host);
  input.focus({ preventScroll:true });
  if (embedded) {
    resizeObserver = new ResizeObserver(reportSize);
    for (const element of [shadow.querySelector('.panel'),shadow.querySelector('.input-row'),list,error]) resizeObserver.observe(element);
    reportSize();
  }
  refresh();
})();
