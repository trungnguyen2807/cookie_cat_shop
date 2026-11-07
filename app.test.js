const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const game = require('./game');
const source = fs.readFileSync(require.resolve('./app.js'), 'utf8');
function boot(raw = null) {
  let storage = raw;
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', children: [],
      get valueAsNumber() { return Number(this.value); }, handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; },
      replaceChildren() { this.children = []; }, append(el) { this.children.push(el); },
      prepend(el) { this.children.unshift(el); }, setAttribute() {}, scrollIntoView() {},
      style: { setProperty() {} }, remove() {} });
    return elements.get(id);
  };
  const context = { window: { CookieGame: game, matchMedia: () => ({ matches: true }), confirm: () => true },
    document: { getElementById: get, createElement: () => ({ setAttribute() {} }) },
    localStorage: { getItem: () => storage, setItem: (_, value) => { storage = value; } },
    Intl, setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext(source, context);
  return { get, stored: () => JSON.parse(storage) };
}
test('tampered or malformed browser saves recover visibly without rendering injected data', () => {
  for (const raw of ['{broken', JSON.stringify({ ...game.initial(), cash: 999999 }), JSON.stringify({ ...game.initial(), history: [{ day: '<img src=x onerror=alert(1)>' }] })]) {
    const app = boot(raw);
    assert.equal(app.get('cash').textContent, '$100.00');
    assert.match(app.get('welcome').children[0].textContent, /invalid or inconsistent/);
    assert.doesNotMatch(app.get('ledger-body').innerHTML, /onerror/);
  }
});
test('repeat submit and skip actions do not duplicate daily sales', () => {
  const app = boot();
  assert.doesNotThrow(() => app.get('skip-customers').handlers.click());
  const submit = () => app.get('plan-form').handlers.submit({ preventDefault() {} });
  submit(); const first = app.stored();
  submit(); assert.deepEqual(app.stored(), first);
  app.get('skip-customers').handlers.click();
  app.get('skip-customers').handlers.click();
  assert.deepEqual(app.stored(), first);
  submit(); assert.equal(app.stored().history.length, 2);
});
test('bypassing disabled controls cannot spend more cash than available', () => {
  const app = boot();
  app.get('quantity-classic').value = 10000;
  app.get('plan-form').handlers.submit({ preventDefault() {} });
  assert.match(app.get('validation').textContent, /more than your cash/);
  assert.equal(app.get('cash').textContent, '$100.00');
});
