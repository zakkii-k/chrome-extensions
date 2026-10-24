(() => {
  const stateKey='__newTabLauncherFrameV1';
  if(globalThis[stateKey]){globalThis[stateKey]();return;}
  const previousFocus=document.activeElement;
  const host=document.createElement('div');
  host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;';
  const shadow=host.attachShadow({mode:'closed'});
  shadow.innerHTML=`<style>
    * { box-sizing:border-box; }
    dialog { position:fixed;inset:0;margin:0;border:0;padding:0;width:100vw;max-width:none;height:100dvh;max-height:none;background:transparent;overflow:hidden; }
    dialog::backdrop { background:rgb(20 25 35 / .12); }
    .scrim { width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;padding:min(26vh,220px) 24px 24px; }
    .card { width:min(720px,100%);border:1px solid #e6e7e9;border-radius:16px;background:#fff;box-shadow:0 18px 60px #0003,0 3px 12px #0001;overflow:hidden; }
    iframe { display:block;width:100%;height:74px;border:0;background:#fff; }
    @media(max-width:480px){.scrim{padding:18vh 14px 14px;}}
  </style><dialog aria-label="検索"><div class="scrim"><section class="card"><iframe title="検索またはURL" allow="clipboard-read; clipboard-write"></iframe></section></div></dialog>`;
  const dialog=shadow.querySelector('dialog');
  const frame=shadow.querySelector('iframe');
  const token=crypto.randomUUID();
  const origin=new URL(chrome.runtime.getURL('frame.html')).origin;
  const overflow=document.documentElement.style.getPropertyValue('overflow');
  const priority=document.documentElement.style.getPropertyPriority('overflow');
  let desiredHeight=74;
  let closed=false;
  function resize(){
    if(closed)return;
    const top=window.matchMedia('(max-width:480px)').matches?innerHeight*.18:Math.min(innerHeight*.26,220);
    frame.style.height=`${Math.max(74,Math.min(desiredHeight,innerHeight-top-26))}px`;
  }
  function close(){
    if(closed)return;
    closed=true;
    window.removeEventListener('message',receive);
    window.removeEventListener('resize',resize);
    window.removeEventListener('pagehide',close);
    dialog.close();host.remove();delete globalThis[stateKey];
    if(overflow)document.documentElement.style.setProperty('overflow',overflow,priority);
    else document.documentElement.style.removeProperty('overflow');
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function receive(event){
    if(event.source!==frame.contentWindow||event.origin!==origin||event.data?.token!==token)return;
    if(event.data.type==='launcher:close')close();
    if(event.data.type==='launcher:size'&&Number.isFinite(event.data.height)){
      desiredHeight=Math.max(74,Math.min(580,event.data.height));resize();
    }
  }
  globalThis[stateKey]=close;
  window.addEventListener('message',receive);
  window.addEventListener('resize',resize);
  window.addEventListener('pagehide',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  shadow.querySelector('.scrim').addEventListener('click',event=>{if(event.target.classList.contains('scrim'))close();});
  const hash=new URLSearchParams({token,parentOrigin:location.origin});
  frame.src=`${chrome.runtime.getURL('frame.html')}#${hash}`;
  (document.body||document.documentElement).append(host);
  document.documentElement.style.setProperty('overflow','hidden');
  dialog.showModal();
  frame.focus({preventScroll:true});
})();
