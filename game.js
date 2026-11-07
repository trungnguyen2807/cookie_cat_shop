(function (root) {
  'use strict';
  const events = [
    { title: 'A lovely day for cookies', copy: 'Steady foot traffic. A fresh start for your shop.', icon: '☀', multiplier: 1 },
    { title: 'A rainy afternoon', copy: 'Fewer people out walking. Plan a smaller batch.', icon: '☂', multiplier: .72 },
    { title: 'The neighborhood market', copy: 'More neighbors, more sweet cravings.', icon: '✦', multiplier: 1.3 },
    { title: 'A cozy, quiet day', copy: 'A slower day on the street. Watch your costs.', icon: '☁', multiplier: .85 },
    { title: 'Word on the street', copy: 'Your shop is getting attention. Expect extra visitors.', icon: '♡', multiplier: 1.18 },
    { title: 'Weekend cookie rush', copy: 'Everyone wants a treat. Make the most of the crowd.', icon: '☀', multiplier: 1.45 }
  ];
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  function initial() { return { version: 1, cash: 100, history: [], event: 0 }; }
  function cost(plan) { return money(plan.quantity * .5 + plan.advertising + 5); }
  function validate(state, plan) {
    if (state.history.length >= 30 || state.cash < 5) return 'This shop run has finished. Start a new game to play again.';
    if (!Number.isInteger(plan.quantity) || plan.quantity < 0 || plan.quantity > 10000) return 'Bake a whole number of cookies between 0 and 10,000.';
    if (!Number.isFinite(plan.price) || plan.price < .25 || plan.price > 20) return 'Choose a price from $0.25 to $20.';
    if (!Number.isFinite(plan.advertising) || plan.advertising < 0 || plan.advertising > 10000) return 'Enter an advertising budget from $0 to $10,000.';
    if (cost(plan) > state.cash) return 'This plan costs more than your cash. Try a smaller batch or less advertising.';
    return '';
  }
  function play(state, plan, random = Math.random) {
    const error = validate(state, plan);
    if (error) throw new Error(error);
    const demand = Math.max(0, Math.round((32 + 13 * Math.sqrt(plan.advertising)) * Math.exp(-.65 * (plan.price - 2)) * events[state.event].multiplier * (.85 + random() * .3)));
    const sold = Math.min(plan.quantity, demand);
    const revenue = money(sold * plan.price), expenses = cost(plan), profit = money(revenue - expenses);
    const row = { day: state.history.length + 1, ...plan, sold, revenue, expenses, profit, cash: money(state.cash + profit), event: state.event };
    return { version: 1, cash: row.cash, history: [...state.history, row], event: Math.min(events.length - 1, Math.floor(random() * events.length)) };
  }
  const api = { events, initial, cost, validate, play };
  if (typeof module !== 'undefined') module.exports = api;
  else root.CookieGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
