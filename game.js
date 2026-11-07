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
  const varieties = [
    { id: 'classic', name: 'Classic chocolate chip', ingredientCost: .5, suggestedPrice: 2 },
    { id: 'oatmeal', name: 'Oatmeal raisin', ingredientCost: .65, suggestedPrice: 2.25 },
    { id: 'double-chocolate', name: 'Double chocolate', ingredientCost: .9, suggestedPrice: 3 }
  ];
  for (const item of [...events, ...varieties]) Object.freeze(item);
  Object.freeze(events);
  Object.freeze(varieties);
  const recipe = id => varieties.find(v => v.id === (id ?? 'classic'));
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  function initial() { return { version: 1, cash: 100, history: [], event: 0 }; }
  const batches = plan => plan.batches === undefined ? [{ variety: plan.variety ?? 'classic', quantity: plan.quantity, price: plan.price }] : plan.batches;
  function breakdown(row) {
    return row.batches ?? [{ variety: row.variety ?? 'classic', quantity: row.quantity, price: row.price,
      sold: row.sold, revenue: row.revenue, ingredients: money(row.quantity * recipe(row.variety).ingredientCost) }];
  }
  function cost(plan) {
    return money(batches(plan).reduce((sum, b) => sum + b.quantity * (recipe(b.variety)?.ingredientCost ?? NaN), 0) + plan.advertising + 5);
  }
  function validate(state, plan) {
    if (state.history.length >= 30 || state.cash < 5) return 'This shop run has finished. Start a new game to play again.';
    if (!plan || typeof plan !== 'object') return 'Enter a valid daily plan.';
    const list = batches(plan);
    if (!Array.isArray(list) || !list.length || list.length > varieties.length) return 'Choose one to three cookie varieties.';
    const seen = new Set();
    for (const b of list) {
      if (!b || !recipe(b.variety) || seen.has(b.variety ?? 'classic')) return 'Choose each available cookie variety once.';
      seen.add(b.variety ?? 'classic');
      if (!Number.isInteger(b.quantity) || b.quantity < 0 || b.quantity > 10000) return 'Bake a whole number of each cookie between 0 and 10,000.';
      if (!Number.isFinite(b.price) || b.price < .25 || b.price > 20 || !Number.isInteger(b.price * 4)) return 'Choose each price from $0.25 to $20.';
    }
    if (!Number.isFinite(plan.advertising) || plan.advertising < 0 || plan.advertising > 10000 || !Number.isInteger(plan.advertising)) return 'Enter an advertising budget from $0 to $10,000.';
    if (cost(plan) > state.cash) return 'This plan costs more than your cash. Try smaller batches or less advertising.';
    return '';
  }
  function play(state, plan, random = Math.random) {
    const error = validate(state, plan);
    if (error) throw new Error(error);
    const list = batches(plan);
    const active = list.filter(b => b.quantity > 0).length;
    const traffic = (32 + 13 * Math.sqrt(plan.advertising)) * events[state.event].multiplier * (.85 + random() * .3);
    // One traffic pool, equal recipe preferences. Price changes conversion relative
    // to each recipe's suggested price. Leftover demand does not switch recipes.
    const desired = list.map(b => b.quantity ? traffic / active * Math.exp(-.65 * (b.price - recipe(b.variety).suggestedPrice)) : 0);
    const allocated = desired.map(Math.floor);
    let remainder = Math.round(desired.reduce((sum, n) => sum + n, 0)) - allocated.reduce((sum, n) => sum + n, 0);
    const order = desired.map((n, i) => i).sort((a, b) => (desired[b] - allocated[b]) - (desired[a] - allocated[a]));
    for (const i of order) if (remainder > 0) { allocated[i]++; remainder--; }
    const results = list.map((b, i) => {
      const sold = Math.min(b.quantity, allocated[i]);
      return { variety: recipe(b.variety).id, quantity: b.quantity, price: b.price, sold,
        revenue: money(sold * b.price), ingredients: money(b.quantity * recipe(b.variety).ingredientCost) };
    });
    const sold = results.reduce((sum, b) => sum + b.sold, 0);
    const quantity = results.reduce((sum, b) => sum + b.quantity, 0);
    const revenue = money(results.reduce((sum, b) => sum + b.revenue, 0));
    const expenses = cost(plan), profit = money(revenue - expenses);
    const row = { day: state.history.length + 1, quantity, advertising: plan.advertising, batches: results,
      ...(results.length === 1 ? { variety: results[0].variety, price: results[0].price } : {}),
      sold, revenue, expenses, profit, cash: money(state.cash + profit), event: state.event };
    return { version: 1, cash: row.cash, history: [...state.history, row], event: Math.min(events.length - 1, Math.floor(random() * events.length)) };
  }
  // Treat browser storage as untrusted. Reconcile every day from the $100 start,
  // returning only known fields so injected strings/objects cannot reach the UI.
  function restore(saved) {
    try {
      if (!saved || saved.version !== 1 || !Array.isArray(saved.history) || saved.history.length > 30 ||
          !Number.isInteger(saved.event) || !events[saved.event]) return null;
      const clean = initial();
      const isMoney = n => Number.isFinite(n) && n >= 0 && Math.abs(n - money(n)) < 1e-8;
      const same = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-8;
      for (const row of saved.history) {
        if (!row || row.day !== clean.history.length + 1 || !Number.isInteger(row.event) || !events[row.event] ||
            (!clean.history.length && row.event !== 0)) return null;
        const list = breakdown(row);
        const dailyPlan = { batches: list, advertising: row.advertising };
        if (validate(clean, dailyPlan)) return null;
        let quantity = 0, sold = 0, revenue = 0;
        const normalized = [];
        const active = list.filter(b => b.quantity > 0).length;
        const maxTraffic = (32 + 13 * Math.sqrt(row.advertising)) * events[row.event].multiplier * 1.15;
        for (const b of list) {
          const maxSales = b.quantity ? Math.ceil(maxTraffic / active * Math.exp(-.65 * (b.price - recipe(b.variety).suggestedPrice))) : 0;
          if (!Number.isInteger(b.sold) || b.sold > maxSales || b.sold < 0 || b.sold > b.quantity ||
              !same(b.revenue, money(b.sold * b.price)) ||
              !same(b.ingredients, money(b.quantity * recipe(b.variety).ingredientCost))) return null;
          normalized.push({ variety: recipe(b.variety).id, quantity: b.quantity, price: b.price,
            sold: b.sold, revenue: b.revenue, ingredients: b.ingredients });
          quantity += b.quantity; sold += b.sold; revenue += b.revenue;
        }
        revenue = money(revenue);
        const expenses = cost(dailyPlan), profit = money(revenue - expenses), cash = money(clean.cash + profit);
        if (row.quantity !== quantity || row.sold !== sold || !same(row.revenue, revenue) ||
            !same(row.expenses, expenses) || !same(row.profit, profit) || !same(row.cash, cash) || !isMoney(cash)) return null;
        clean.history.push({ day: row.day, quantity, advertising: row.advertising,
          ...(normalized.length === 1 ? { variety: normalized[0].variety, price: normalized[0].price } : {}),
          batches: normalized, sold, revenue, expenses, profit, cash, event: row.event });
        clean.cash = cash;
      }
      if (!isMoney(saved.cash) || !same(saved.cash, clean.cash)) return null;
      clean.event = saved.event;
      return clean;
    } catch (_) { return null; }
  }
  const api = Object.freeze({ events, varieties, recipe, breakdown, initial, cost, validate, play, restore });
  if (typeof module !== 'undefined') module.exports = api;
  else root.CookieGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
