(() => {
  const stateKey = "__newTabLauncherV1";
  if (globalThis[stateKey]) {
    globalThis[stateKey]();
    return;
  }
  const popup = document.documentElement.hasAttribute("data-launcher-popup") &&
    location.protocol === "chrome-extension:";
  const standalone = popup && document.documentElement.hasAttribute("data-launcher-window");
  const previousFocus = document.activeElement;
  const host = document.createElement("div");
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { color-scheme: dark; }
      * { box-sizing: border-box; }
      .backdrop { position:fixed; inset:0; display:flex; align-items:flex-start; justify-content:center;
        padding: min(24vh, 180px) 20px 20px; background:rgb(9 12 19 / .35);
        font-family:"Segoe UI",system-ui,sans-serif; color:#f0f1f5; }
      .panel { width: min(620px, 100%); padding:22px; border:1px solid #444751; border-radius:18px;
        background:#202228; box-shadow:0 24px 90px #0007; }
      .label { display:block; font-size:12px; font-weight:600; color:#b9bdc9; margin-bottom:14px; }
      .row { display:flex; align-items:center; gap:14px; }
      svg { flex-shrink:0; color:#adb5cb; width:22px; height:22px; }
      input { width:100%; min-width:0; background:transparent; border:0; outline:none; color:#f5f6fa;
        font:400 22px/1.5 "Segoe UI",system-ui,sans-serif; padding:0; caret-color:#bdcaff; }
      input::placeholder { color:#8e94a3; }
      .footer { display:flex; align-items:center; justify-content:space-between; gap:12px;
        margin-top:22px; padding-top:14px; border-top:1px solid #383b45; font-size:12px; color:#b9bdc9; }
      button { border:1px solid #545a6d; border-radius:7px; padding:7px 12px; background:#353b50;
        color:#edf0ff; font:600 12px "Segoe UI",system-ui,sans-serif; cursor:pointer; }
      button:hover { background:#464f6b; }
      button:focus-visible { outline:2px solid #b9c9ff; outline-offset:3px; }
      button:disabled { opacity:.5; cursor:wait; }
      .error { color:#ffb4b4; font-size:13px; margin:12px 0 0; }
      .error:empty { display:none; }
      kbd { font:inherit; color:#d6dae5; }
      .popup { position:relative; padding:0; background:transparent; }
      .popup .panel { width:560px; border:0; border-radius:0; box-shadow:none; }
      .standalone { padding:20px; align-items:center; background:#17191e; }
      .standalone .panel { box-shadow:none; }
      @media (max-width:480px) { .panel { padding:18px; } input { font-size:18px; }
        .footer { align-items:flex-start; } .footer span { max-width:180px; line-height:1.6; } }
      @media (prefers-reduced-motion:no-preference) { .panel { animation:appear .12s ease-out; }
        @keyframes appear { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } } }
    </style>
    <div class="backdrop ${standalone ? "standalone" : popup ? "popup" : ""}">
      <section class="panel" role="dialog" aria-modal="true" aria-label="新しいタブで検索">
        <form>
          <label class="label" for="query">新しいタブで検索</label>
          <div class="row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
            <input id="query" type="text" placeholder="検索ワード、またはURL" autocomplete="off" spellcheck="false" aria-describedby="hint error">
          </div>
          <div class="footer"><span id="hint">毎回、新しいタブへ · <kbd>Esc</kbd> で閉じる</span><button type="submit">開く <kbd>↵</kbd></button></div>
          <p class="error" id="error" role="alert"></p>
        </form>
      </section>
    </div>`;
  const input = shadow.querySelector("input");
  const button = shadow.querySelector("button");
  const error = shadow.querySelector(".error");
  let pending = false;
  let composing = false;
  const close = () => {
    if (popup) { window.close(); return; }
    host.remove();
    delete globalThis[stateKey];
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  globalThis[stateKey] = close;
  shadow.querySelector(".backdrop").addEventListener("click", (event) => {
    if (event.target.classList.contains("backdrop")) close();
  });
  shadow.addEventListener("keydown", (event) => {
    // Keep page shortcuts from consuming text typed into the launcher.
    event.stopPropagation();
    if (event.isComposing || composing || event.keyCode === 229) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "Tab") {
      event.preventDefault();
      (shadow.activeElement === input ? button : input).focus();
    }
  });
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; });
  shadow.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending || composing || !input.value.trim()) return;
    pending = true;
    button.disabled = true;
    input.readOnly = true;
    error.textContent = "";
    try {
      const response = await chrome.runtime.sendMessage({ type: "launcher:submit", text: input.value });
      if (!response?.ok) throw new Error(response?.error || "検索バーを開き直してください。");
      close();
    } catch (cause) {
      error.textContent = cause.message;
      pending = false;
      button.disabled = false;
      input.readOnly = false;
      input.focus();
    }
  });
  (document.body || document.documentElement).append(host);
  input.focus({ preventScroll: true });
})();
