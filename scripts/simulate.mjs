import assert from 'node:assert/strict';
import game from '../game.js';

const results = [];
for (let run = 1; run <= 30; run++) {
  // A fixed seed makes each sample run different but repeatable.
  let seed = 20261111 + run * 7919;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let state = game.initial();
  let reducedDays = 0;
  while (state.history.length < 30 && state.cash >= 5) {
    const plan = { batches: game.varieties.map(v => ({ variety: v.id, quantity: 40, price: v.suggestedPrice - .25 })), advertising: Math.min(5, Math.floor(state.cash - 5)) };
    if (game.cost(plan) > state.cash) reducedDays++;
    // Reduce production instead of borrowing money the player does not have.
    while (game.cost(plan) > state.cash) {
      const largest = [...plan.batches].sort((a, b) => b.quantity - a.quantity)[0];
      assert.ok(largest.quantity > 0);
      largest.quantity--;
    }
    state = game.play(state, plan, random);
    // Check save integrity after every simulated day, not just the final result.
    assert.ok(game.restore(state), `Invalid save: run ${run}, day ${state.history.length}`);
    const row = state.history.at(-1);
    assert.ok(row.sold <= row.baskets.reduce((sum, n) => sum + n, 0));
    assert.ok(row.baskets.every(n => n >= 1 && n <= 8));
  }
  results.push({ run, days: state.history.length, cash: state.cash, reducedDays });
}
console.log(JSON.stringify({
  strategy: '40 of each recipe daily; prices 1.75/2/2.75; advertising $5; trim batches only if cash is insufficient',
  summary: {
    average: Math.round(results.reduce((sum, r) => sum + r.cash, 0) / results.length * 100) / 100,
    minimum: Math.min(...results.map(r => r.cash)),
    maximum: Math.max(...results.map(r => r.cash)),
    completed: results.filter(r => r.days === 30).length,
  },
  results,
}, null, 2));
