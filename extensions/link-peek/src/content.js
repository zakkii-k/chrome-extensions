(async () => {
  const {previewLink,webUrl} = await import(chrome.runtime.getURL('policy.js'));
  const extensionOrigin = chrome.runtime.getURL('').replace(/\/$/,'');
  const previewChild = window.top !== window && [...location.ancestorOrigins].includes(extensionOrigin);
  if (window.top !== window) {
    if (!previewChild) return;
    window.addEventListener('keydown',event => {
      if (event.key === 'Escape' && !event.isComposing) {
        event.preventDefault();
        chrome.runtime.sendMessage({type:'peek:close-child'}).catch(() => {});
      }
    },true);
    // Let the extension frame initiate navigation, keeping the temporary header
    // exception scoped to this preview instead of other frames on the page.
    window.addEventListener('click',event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement);
      const url = anchor && !anchor.hasAttribute('download') && webUrl(anchor.href,location.href);
      if (url && (!new URL(url).hash || url.split('#')[0] !== location.href.split('#')[0])) {
        event.preventDefault();event.stopImmediatePropagation();
        chrome.runtime.sendMessage({type:'peek:navigate-child',url}).catch(() => {});
      }
    },true);
    return;
  }
  let enabled = true;
  let current;
  const configuration = await chrome.runtime.sendMessage({type:'peek:config'}).catch(() => null);
  if (configuration?.ok) enabled = configuration.enabled;
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
  function close() {
    if (!current) return;
    const state=current;current=null;
    clearTimeout(state.timeout);
    window.removeEventListener('message',state.message);
    state.dialog.close();state.host.remove();
    document.documentElement.style.setProperty('overflow',state.overflow,state.priority);
    if (!state.overflow) document.documentElement.style.removeProperty('overflow');
    if (state.previousFocus?.isConnected) state.previousFocus.focus({preventScroll:true});
    chrome.runtime.sendMessage({type:'peek:unregister',token:state.token}).catch(() => {});
  }
  async function expand() {
    const state=current;
    if (!state || state.pending) return;
    state.pending=true;
    state.expand.disabled=true;
    const result=await chrome.runtime.sendMessage({type:'peek:expand',token:state.token,url:state.url}).catch(() => null);
    if (current !== state) return;
    if (result?.ok) close();
    else { state.pending=false;state.expand.disabled=false;state.expand.title='開けませんでした。もう一度お試しください'; }
  }
  function open(url,anchor) {
    close();
    const host=document.createElement('div');
    host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;';
    const shadow=host.attachShadow({mode:'closed'});
    shadow.innerHTML=`<style>
      * { box-sizing:border-box; }
      dialog { position:fixed; inset:0; margin:0; border:0; padding:0; width:100vw; max-width:none; height:100dvh; max-height:none; background:transparent; overflow:hidden; color:#59616f; }
      dialog::backdrop { background:rgb(24 30 42 / .22); }
      .scrim { width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:30px 64px; }
      .panel { position:relative; width:min(1360px,100%); height:100%; background:#fff; border-radius:12px; box-shadow:0 22px 80px #0003; }
      iframe { width:100%; height:100%; display:block; border:0; border-radius:12px; background:#fff; }
      .rail { position:absolute; top:4px; right:-43px; display:flex; flex-direction:column; gap:9px; }
      button { display:grid; place-items:center; width:32px; height:32px; padding:7px; border:1px solid #e4e6ea; border-radius:50%; color:#67717d; background:#fffffff5; box-shadow:0 1px 5px #0001; cursor:pointer; }
      button:hover { background:#eaf1ff; color:#2b66b5; } button:disabled { opacity:.5; cursor:wait; }
      button:focus-visible { outline:2px solid #5b8ed1; outline-offset:3px; }
      svg { width:18px; height:18px; }
      @media(max-width:600px) { .scrim { padding:54px 12px 12px; } .panel,iframe { border-radius:9px; } .rail { top:-42px; right:0; flex-direction:row; } }
      @media(prefers-reduced-motion:no-preference) { .panel { animation:appear .12s ease-out; } @keyframes appear { from { opacity:0;transform:translateY(5px); } to { opacity:1;transform:none; } } }
    </style><dialog aria-label="リンクのプレビュー"><div class="scrim"><section class="panel"><iframe title="リンクのプレビュー"></iframe><nav class="rail"><button type="button" class="close" aria-label="閉じる" title="閉じる">${closeIcon}</button><button type="button" class="expand" aria-label="タブで開く" title="タブで開く">${expandIcon}</button></nav></section></div></dialog>`;
    const state={
      host,dialog:shadow.querySelector('dialog'),frame:shadow.querySelector('iframe'),expand:shadow.querySelector('.expand'),
      token:crypto.randomUUID(),url,pending:false,previousFocus:anchor || document.activeElement,
      overflow:document.documentElement.style.getPropertyValue('overflow'),priority:document.documentElement.style.getPropertyPriority('overflow')
    };
    current=state;
    state.message=event => {
      if (current !== state || event.source !== state.frame.contentWindow || event.origin !== extensionOrigin) return;
      if (event.data?.type === 'peek:viewer-ready') {
        clearTimeout(state.timeout);
        state.frame.contentWindow.postMessage({type:'peek:init',token:state.token,url},extensionOrigin);
      } else if (event.data?.token === state.token) {
        if (event.data.type === 'peek:expand-request') expand();
        if (event.data.type === 'peek:close-request') close();
      }
    };
    window.addEventListener('message',state.message);
    state.dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    shadow.querySelector('.close').addEventListener('click',close);
    state.expand.addEventListener('click',expand);
    shadow.querySelector('.scrim').addEventListener('click',event=>{if(event.target.classList.contains('scrim'))close();});
    (document.body || document.documentElement).append(host);
    document.documentElement.style.setProperty('overflow','hidden');
    state.dialog.showModal();
    state.frame.src=chrome.runtime.getURL('viewer.html');
    shadow.querySelector('.close').focus({preventScroll:true});
    // If the source site's policy blocks even the extension frame, keep the
    // expand button available; do not silently open a browser tab.
    state.timeout=setTimeout(()=>{
      if (current===state) state.frame.title='表示できません。右上の拡大ボタンでタブとして開けます';
    },15000);
  }
  window.addEventListener('click',event=>{
    if (!enabled || current) return;
    const anchor=event.composedPath().find(node=>node instanceof HTMLAnchorElement);
    if (!anchor) return;
    const url=previewLink(event,{href:anchor.href,download:anchor.hasAttribute('download'),target:anchor.target},location.href);
    if (!url) return;
    event.preventDefault();event.stopImmediatePropagation();open(url,anchor);
  },true);
  chrome.runtime.onMessage.addListener(message=>{
    if (message?.type==='peek:close' && current?.token===message.token) close();
    if (message?.type==='peek:enabled') {enabled=message.enabled;if(!enabled)close();}
  });
  window.addEventListener('pagehide',close);
})().catch(error=>console.warn('Link Peek could not initialize:',error.message));
