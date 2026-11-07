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
test('recipes use their own ingredient cost and preserve identity in saved days', () => {
  const row = game.play(game.initial(), { quantity: 20, price: 3, advertising: 0, variety: 'double-chocolate' }, () => .5).history[0];
  assert.equal(row.expenses, 23);
  assert.equal(row.sold, 20);
  assert.equal(row.revenue, 60);
  assert.equal(row.cash, 137);
  assert.equal(JSON.parse(JSON.stringify(row)).variety, 'double-chocolate');
});
test('premium recipes have demand at suggested price and enforce affordability', () => {
  const row = game.play(game.initial(), { quantity: 100, price: 3, advertising: 0, variety: 'double-chocolate' }, () => .5).history[0];
  assert.equal(row.sold, 32);
  assert.throws(() => game.play(game.initial(), { quantity: 110, price: 3, advertising: 0, variety: 'double-chocolate' }));
  assert.equal(game.cost({ quantity: 40, price: 2.25, advertising: 5, variety: 'oatmeal' }), 36);
});
test('unknown recipes are rejected and old plans remain classic', () => {
  assert.throws(() => game.play(game.initial(), { ...plan, variety: '<script>' }));
  assert.equal(game.play(game.initial(), plan, () => .5).history[0].variety, 'classic');
});

test('mixed day reconciles each recipe and charges shared expenses once', () => {
  const p = { batches: [{variety:'classic',quantity:10,price:2},{variety:'oatmeal',quantity:10,price:2.25},{variety:'double-chocolate',quantity:10,price:3}], advertising:5 };
  const row = game.play(game.initial(), p, () => .5).history[0];
  assert.equal(row.quantity,30); assert.equal(row.sold,30);
  assert.equal(row.revenue,72.5); assert.equal(row.expenses,30.5);
  assert.equal(row.profit,42); assert.equal(row.cash,142);
  assert.deepEqual(row.batches.map(b=>b.ingredients),[5,6.5,9]);
  assert.deepEqual(row.batches.map(b=>b.revenue),[20,22.5,30]);
  assert.equal(JSON.parse(JSON.stringify(row)).batches.length,3);
});
test('all recipes share one traffic pool and cannot sell beyond their own stock', () => {
  const batches = game.varieties.map(v=>({variety:v.id,quantity:100,price:v.suggestedPrice}));
  const row = game.play({...game.initial(),cash:1000},{batches,advertising:0},()=>.5).history[0];
  assert.equal(row.sold,32);
  assert.deepEqual(row.batches.map(b=>b.sold),[11,11,10]);
  batches[0].quantity=1;
  const limited=game.play({...game.initial(),cash:1000},{batches,advertising:0},()=>.5).history[0];
  assert.equal(limited.batches[0].sold,1);
  assert.ok(limited.batches.every(b=>b.sold<=b.quantity));
  batches[1].price=10;
  assert.ok(game.play({...game.initial(),cash:1000},{batches,advertising:0},()=>.5).history[0].batches[1].sold<11);
});
test('combined cost enforces cash and zero quantities skip demand', () => {
  const batches=[{variety:'classic',quantity:100,price:2},{variety:'double-chocolate',quantity:60,price:3}];
  assert.throws(()=>game.play(game.initial(),{batches,advertising:0}));
  const p={batches:[{variety:'classic',quantity:0,price:2},{variety:'double-chocolate',quantity:40,price:3}],advertising:0};
  const row=game.play(game.initial(),p,()=>.5).history[0];
  assert.equal(row.sold,32); assert.equal(row.batches[0].sold,0); assert.equal(row.expenses,41);
  p.batches[1].quantity=0;
  const quiet=game.play(game.initial(),p,()=>.5).history[0];
  assert.equal(quiet.sold,0); assert.equal(quiet.expenses,5);
});
test('mixed plans reject duplicate and invalid recipes and quantities', () => {
  for(const batches of [[],[{variety:'classic',quantity:1,price:2},{variety:'classic',quantity:2,price:2}],[{variety:'unknown',quantity:1,price:2}],[{variety:'classic',quantity:-1,price:2}],[{variety:'classic',quantity:1,price:NaN}]]) assert.throws(()=>game.play(game.initial(),{batches,advertising:0}));
});
test('legacy saved rows normalize for breakdowns without losing finances', () => {
  const row={day:1,quantity:20,price:2,sold:12,revenue:24,expenses:15,profit:9,cash:109};
  assert.deepEqual(game.breakdown(row),[{variety:'classic',quantity:20,price:2,sold:12,revenue:24,ingredients:10}]);
  assert.equal(game.breakdown({...row,variety:'oatmeal'})[0].ingredients,13);
});
