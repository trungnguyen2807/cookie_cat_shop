const { test } = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game');
const plan = { quantity: 40, price: 2, advertising: 5 };
test('starts at $100 and reconciles daily finances', () => {
  const result = game.play(game.initial(), plan, () => .5);
  const row = result.history[0];
  assert.equal(row.sold, 40);
  assert.equal(row.revenue, 80);
  assert.equal(row.expenses, 30);
  assert.equal(row.profit, 50);
  assert.equal(result.cash, 150);
});
test('prevents overspending and invalid input', () => {
  for (const p of [{ ...plan, quantity: 1000 }, { ...plan, quantity: 1.5 }, { ...plan, price: NaN }, { ...plan, advertising: -1 }]) {
    assert.throws(() => game.play(game.initial(), p));
  }
});
test('higher price reduces demand and advertising increases it', () => {
  const run = (price, advertising) => game.play({ ...game.initial(), cash: 1000 }, { quantity: 500, price, advertising }, () => .5).history[0].sold;
  assert.ok(run(1, 0) > run(3, 0));
  assert.ok(run(2, 10) > run(2, 0));
});
test('unsold cookies cost money and sales never exceed stock', () => {
  const row = game.play({ ...game.initial(), cash: 1000 }, { quantity: 500, price: 20, advertising: 0 }, () => .5).history[0];
  assert.equal(row.expenses, 255);
  assert.equal(row.sold, 0);
  assert.equal(row.profit, -255);
});
test('ends at exactly 30 days and blocks further play', () => {
  let state = game.initial();
  for (let day = 0; day < 30; day++) state = game.play(state, { quantity: 20, price: 2, advertising: 0 }, () => .5);
  assert.equal(state.history.length, 30);
  assert.throws(() => game.play(state, plan));
  assert.equal(state.cash, 850);
});
test('closes when overhead cannot be afforded', () => {
  const state = game.play({ ...game.initial(), cash: 5 }, { quantity: 0, price: 2, advertising: 0 }, () => .5);
  assert.equal(state.cash, 0);
  assert.throws(() => game.play(state, plan));
});
