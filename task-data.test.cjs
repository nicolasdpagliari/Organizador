"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("./task-data.js");
const task = { id: "one", title: "Prueba", description: "", completed: false };
function storage(initial = "original") {
  return { value: initial, setItem(key, value) { assert.equal(key, D.STORAGE_KEY); this.value = value; } };
}
test("validates content, IDs, types and length boundaries", () => {
  assert.equal(D.validateTasks([{ ...task, title: "x".repeat(150), description: "x".repeat(3000) }]).length, 1);
  for (const invalid of [null, {}, [task, task], [{ ...task, id: " " }], [{ ...task, title: " " }], [{ ...task, title: "x".repeat(151) }], [{ ...task, description: "x".repeat(3001) }], [{ ...task, description: null }], [{ ...task, completed: "false" }]]) {
    assert.throws(() => D.validateTasks(invalid));
  }
});
test("legacy loading accepts old lengths without silently deleting data", () => {
  assert.equal(D.validateTasks([{ ...task, title: "x".repeat(151) }], false).length, 1);
});
test("backup round trip, empty backup and invalid envelopes", () => {
  assert.deepEqual(D.parseBackup(JSON.stringify(D.makeBackup([task]))).tasks, [task]);
  assert.deepEqual(D.parseBackup(JSON.stringify(D.makeBackup([]))).tasks, []);
  for (const value of ["{", "null", "[]", JSON.stringify({ ...D.makeBackup([task]), formatVersion: 2 }), JSON.stringify({ ...D.makeBackup([task]), exportedAt: "bad" }), JSON.stringify(D.makeBackup([task, task]))]) assert.throws(() => D.parseBackup(value));
});
test("save reports success and storage access or quota errors", () => {
  const s = storage();
  assert.equal(D.writeTasks(() => s, [task]).ok, true);
  assert.deepEqual(JSON.parse(s.value), [task]);
  assert.equal(D.writeTasks(() => { throw new Error("SecurityError"); }, [task]).ok, false);
  assert.equal(D.writeTasks(() => ({ setItem() { throw new Error("QuotaExceededError"); } }), [task]).ok, false);
});
test("unreadable storage cannot be overwritten", () => {
  let accessed = false;
  assert.equal(D.writeTasks(() => { accessed = true; }, [task], false).reason, "protected");
  assert.equal(accessed, false);
});
test("import commits only valid data after successful persistence", () => {
  const current = [task];
  const incoming = [{ ...task, id: "two" }];
  const s = storage();
  const result = D.importTasks(() => s, current, incoming);
  assert.equal(result.ok, true);
  assert.deepEqual(result.tasks, incoming);
  assert.deepEqual(JSON.parse(s.value), incoming);
  assert.deepEqual(current, [task]);
});
test("import failures preserve original memory and stored bytes", () => {
  const current = [task];
  const s = storage();
  for (const result of [D.importTasks(() => s, current, [task, task]), D.importTasks(() => s, current, [], false), D.importTasks(() => ({ setItem() { throw new Error("quota"); } }), current, [])]) {
    assert.equal(result.ok, false);
    assert.equal(result.tasks, current);
    assert.equal(s.value, "original");
  }
});

// Exercise actual UI handlers in an isolated minimal DOM, never a real profile.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function app({ initial = null, fail = false, confirm = true } = {}) {
  const elements = new Map();
  function element() {
    return { value: "", hidden: false, textContent: "", children: [], handlers: {}, dataset: {},
      addEventListener(type, callback) { this.handlers[type] = callback; },
      setAttribute() {}, removeAttribute() {}, focus() {}, click() {}, remove() {},
      append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; },
      querySelector(selector) { return get(selector); }, reset() { get("#task-title").value = ""; get("#task-description").value = ""; }
    };
  }
  function get(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }
  get("#theme").value = "system";
  const stored = new Map(initial === null ? [] : [[D.STORAGE_KEY, initial]]);
  let writes = 0;
  const context = vm.createContext({
    document: { querySelector: get, querySelectorAll: () => [], createElement: element, body: element(), documentElement: element() },
    window: { confirm: () => confirm, matchMedia: () => ({ matches: false, addEventListener() {} }) },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem(key, value) { writes++; if (fail) throw new Error("quota"); stored.set(key, value); } },
    setTimeout, Blob, URL
  });
  for (const name of ["task-data.js", "script.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, name), "utf8"), context);
  return { get, stored, context, writes: () => writes, state: () => JSON.parse(vm.runInContext("JSON.stringify(tasks)", context)) };
}
test("startup never writes tasks and preserves malformed storage", () => {
  const a = app({ initial: "broken" });
  assert.equal(a.writes(), 0);
  a.get("#task-title").value = "Solo en memoria";
  a.get("#task-form").handlers.submit({ preventDefault() {} });
  assert.equal(a.state().length, 1);
  assert.equal(a.stored.get(D.STORAGE_KEY), "broken");
  assert.equal(a.writes(), 0);
  assert.match(a.get("#status").textContent, /solo en memoria/);
});
test("editing after failed persistence never announces saved changes", () => {
  const a = app({ initial: JSON.stringify([task]), fail: true });
  vm.runInContext("editTask(tasks[0])", a.context);
  a.get("#task-title").value = "Modificado";
  a.get("#task-form").handlers.submit({ preventDefault() {} });
  assert.equal(a.state()[0].title, "Modificado");
  assert.equal(JSON.parse(a.stored.get(D.STORAGE_KEY))[0].title, task.title);
  assert.doesNotMatch(a.get("#status").textContent, /Cambios guardados/);
  assert.equal(a.get("#storage-error").hidden, false);
});
test("actual import handler preserves originals on cancellation, invalid file and write failure", async () => {
  for (const options of [{ confirm: false }, { fail: true }, { invalid: true }]) {
    const a = app({ initial: JSON.stringify([task]), ...options });
    const target = { files: [{ size: 100, text: async () => options.invalid ? "{}" : JSON.stringify(D.makeBackup([])) }], value: "copy.json" };
    await a.get("#import-file").handlers.change({ target });
    assert.deepEqual(a.state(), [task]);
    assert.equal(a.stored.get(D.STORAGE_KEY), JSON.stringify([task]));
    assert.equal(target.value, "");
    assert.equal(a.get("#import-tasks").disabled, false);
  }
});
test("confirmed import updates memory, storage and progress together", async () => {
  const a = app({ initial: JSON.stringify([task]) });
  const incoming = [{ ...task, id: "imported", completed: true }];
  await a.get("#import-file").handlers.change({ target: { files: [{ size: 100, text: async () => JSON.stringify(D.makeBackup(incoming)) }] } });
  assert.deepEqual(a.state(), incoming);
  assert.deepEqual(JSON.parse(a.stored.get(D.STORAGE_KEY)), incoming);
  assert.equal(a.get("#task-progress").value, 100);
});
test("create, complete, filter, cancel editing and delete remain available", () => {
  const a = app();
  a.get("#task-title").value = "  Primera  ";
  a.get("#task-description").value = "Detalle";
  a.get("#task-form").handlers.submit({ preventDefault() {} });
  assert.equal(a.state()[0].title, "Primera");
  const row = a.get("#task-list").children[0];
  const checkbox = row.children[0];
  checkbox.checked = true;
  checkbox.handlers.change();
  assert.equal(a.state()[0].completed, true);
  assert.equal(a.get("#task-progress").value, 100);
  vm.runInContext('filter = "pending"; renderTasks()', a.context);
  assert.equal(a.get("#task-list").children.length, 0);
  assert.equal(a.state().length, 1);
  vm.runInContext('filter = "all"; renderTasks(); editTask(tasks[0])', a.context);
  a.get("#task-title").value = "No guardar";
  a.get("#cancel-edit").handlers.click();
  assert.equal(a.state()[0].title, "Primera");
  const actions = a.get("#task-list").children[0].children[2];
  actions.children[1].handlers.click();
  assert.equal(a.state().length, 0);
  assert.deepEqual(JSON.parse(a.stored.get(D.STORAGE_KEY)), []);
});
