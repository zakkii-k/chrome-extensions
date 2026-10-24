import test from "node:test";
import assert from "node:assert/strict";
import { launch, submissionSource } from "../extension/launch.js";

const source = { id: 4, windowId: 2 };
const extensionUrl = (file) => `chrome-extension://test-extension/${file}`;
const reject = (message) => async () => { throw new Error(message); };

function browser(overrides = {}) {
  const calls = [];
  const api = {
    runtime: { getURL: extensionUrl },
    tabs: {
      query: async (options) => { calls.push(["query", options]); return [source]; },
      get: async () => source
    },
    scripting: { executeScript: async (options) => calls.push(["inject", options]) },
    action: { openPopup: async () => calls.push(["popup"]) },
    windows: {
      get: async () => ({ id: 2, type: "normal", left: 100, top: 100, width: 1200, height: 800 }),
      getLastFocused: async () => ({ id: 2 }),
      create: async (options) => calls.push(["window", options])
    },
    ...overrides
  };
  return { api, calls };
}

test("missing command tab is resolved before attempting page injection", async () => {
  const { api, calls } = browser();
  assert.equal((await launch(api)).surface, "overlay");
  assert.deepEqual(calls, [
    ["query", { active: true, lastFocusedWindow: true }],
    ["inject", { target: { tabId: 4 }, files: ["launcher.js"] }]
  ]);
});

test("valid command tab does not need another tab query", async () => {
  const { api, calls } = browser();
  assert.equal((await launch(api, source)).surface, "overlay");
  assert.equal(calls.length, 1);
});

test("page injection failures use the toolbar popup and retain original diagnostic", async () => {
  const { api, calls } = browser({ scripting: { executeScript: reject("Cannot access this page") } });
  const result = await launch(api, source);
  assert.equal(result.surface, "toolbar-popup");
  assert.deepEqual(result.failures, [{ stage: "page-injection", message: "Cannot access this page" }]);
  assert.deepEqual(calls, [["popup"]]);
});

test("Dia-style popup failure opens an input window preserving the source", async () => {
  const { api, calls } = browser({
    scripting: { executeScript: reject("Cannot access this page") },
    action: { openPopup: reject("Failed to open popup.") }
  });
  const result = await launch(api, source);
  assert.equal(result.surface, "input-window");
  assert.equal(result.failures.length, 2);
  const options = calls[0][1];
  assert.equal(options.type, "popup");
  const url = new URL(options.url);
  assert.equal(url.searchParams.get("sourceWindow"), "2");
  assert.equal(url.searchParams.get("sourceTab"), "4");
  assert.equal(options.left, 370);
  assert.equal(options.top, 270);
});

test("input window can recover source context when tab query initially returns no tab", async () => {
  const { api } = browser({ action: { openPopup: reject("popup failure") } });
  let queries = 0;
  api.tabs.query = async () => ++queries === 1 ? [] : [source];
  assert.equal((await launch(api)).surface, "input-window");
  assert.equal(queries, 2);
});

test("all display failures report every stage", async () => {
  const { api } = browser({
    scripting: { executeScript: reject("injection failed") },
    action: { openPopup: reject("popup failed") }
  });
  api.windows.create = reject("window failed");
  await assert.rejects(launch(api, source), (error) => {
    for (const text of ["page-injection", "injection failed", "toolbar-popup", "popup failed", "input-window", "window failed"]) {
      assert.ok(error.message.includes(text));
    }
    return true;
  });
});

test("dedicated input window submission restores the original source tab", async () => {
  const { api } = browser();
  assert.deepEqual(await submissionSource(api, {
    url: `${extensionUrl("window.html")}?sourceWindow=2&sourceTab=4`,
    tab: { id: 99, windowId: 100 }
  }), source);
});

test("closed source tab still submits to its original normal window", async () => {
  const { api } = browser();
  api.tabs.get = reject("Tab closed");
  assert.deepEqual(await submissionSource(api, {
    url: `${extensionUrl("window.html")}?sourceWindow=2&sourceTab=4`
  }), { windowId: 2 });
});

test("closed source window is an error rather than a search in the launcher window", async () => {
  const { api } = browser();
  api.windows.get = reject("Window closed");
  await assert.rejects(submissionSource(api, {
    url: `${extensionUrl("window.html")}?sourceWindow=2&sourceTab=4`
  }), /Window closed/);
});

test("normal page senders cannot redirect submissions using URL parameters", async () => {
  const { api } = browser();
  assert.deepEqual(await submissionSource(api, {
    url: "https://example.com/window.html?sourceWindow=99", tab: source
  }), source);
});

test("input window requires a normal source window and valid context", async () => {
  const { api } = browser();
  await assert.rejects(submissionSource(api, { url: extensionUrl("window.html") }), /Missing source/);
  api.windows.get = async () => ({ type: "popup" });
  await assert.rejects(submissionSource(api, {
    url: `${extensionUrl("window.html")}?sourceWindow=2`
  }), /no longer available/);
});
