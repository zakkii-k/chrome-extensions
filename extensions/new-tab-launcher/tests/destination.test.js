import test from "node:test";
import assert from "node:assert/strict";
import { destination, openDestination } from "../src/destination.js";

test("Japanese queries and non-web schemes are searches", () => {
  for (const text of ["東京 ランチ", "cats", "javascript:alert(1)", "file:///tmp/test", "chrome://settings", "user@example.com"]) {
    assert.deepEqual(destination(` ${text} `), { kind: "search", text });
  }
});

test("web addresses support paths, ports, IDNs and explicit HTTP", () => {
  for (const [input, url] of [
    ["example.com", "https://example.com/"],
    ["example.com:8080/path?q=1", "https://example.com:8080/path?q=1"],
    ["http://localhost:3000", "http://localhost:3000/"],
    ["localhost:3000", "https://localhost:3000/"],
    ["127.0.0.1:8080", "https://127.0.0.1:8080/"],
    ["https://example.com/a?q=東京", new URL("https://example.com/a?q=東京").href],
    ["例え.jp", new URL("https://例え.jp").href]
  ]) assert.deepEqual(destination(input), { kind: "url", url });
});

test("empty input cannot create a tab", () => {
  assert.throws(() => destination("  "));
});

test("repeated identical URLs always create distinct new tabs", async () => {
  const created = [];
  const api = { tabs: { create: async (options) => created.push(options) } };
  const original = { id: 7, windowId: 3 };
  await openDestination(api, "example.com", original);
  await openDestination(api, "example.com", original);
  assert.equal(created.length, 2);
  assert.deepEqual(created[0], { url: "https://example.com/", active: true, openerTabId: 7, windowId: 3 });
  assert.deepEqual(original, { id: 7, windowId: 3 });
});

test("search explicitly requests NEW_TAB every time", async () => {
  const queries = [];
  const api = { search: { query: async (options) => queries.push(options) } };
  await openDestination(api, " 東京 ランチ ");
  await openDestination(api, "東京 ランチ");
  assert.deepEqual(queries, Array(2).fill({ text: "東京 ランチ", disposition: "NEW_TAB" }));
});

test("browser failures propagate so the UI can offer retry", async () => {
  await assert.rejects(openDestination({ search: { query: async () => { throw new Error("offline"); } } }, "cats"), /offline/);
});

test("search with a source tab never creates a placeholder history entry", async () => {
  const queries = [];
  const api = {
    tabs: { create: async () => { throw new Error('No placeholder tab'); } },
    search: { query: async (options) => queries.push(options) }
  };
  await openDestination(api, "東京 ランチ", { id: 7, windowId: 3 });
  assert.deepEqual(queries, [{ text: "東京 ランチ", disposition: "NEW_TAB" }]);
});

test("search failure never removes an existing tab", async () => {
  const removed = [];
  const api = {
    tabs: {
      create: async () => { throw new Error('No placeholder tab'); },
      remove: async (id) => removed.push(id)
    },
    search: { query: async () => { throw new Error("Search unavailable"); } }
  };
  await assert.rejects(openDestination(api, "test query", { id: 7, windowId: 3 }), /Search unavailable/);
  assert.deepEqual(removed, []);
});
