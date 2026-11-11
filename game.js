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
  // Freeze the rules so other code cannot accidentally change prices or event effects.
  for (const item of [...events, ...varieties]) Object.freeze(item);
  Object.freeze(events);
  Object.freeze(varieties);
  const recipe = id => varieties.find(v => v.id === (id ?? 'classic'));
  // Round money to cents to avoid visible floating-point errors.
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  function initial() { return { version: 1, cash: 100, history: [], event: 0 }; }
  // Old saves have one recipe; new saves store a list of recipes.
  const batches = plan => plan.batches === undefined ? [{ variety: plan.variety ?? 'classic', quantity: plan.quantity, price: plan.price }] : plan.batches;
  function breakdown(row) {
    return row.batches ?? [{ variety: row.variety ?? 'classic', quantity: row.quantity, price: row.price,
      sold: row.sold, revenue: row.revenue, ingredients: money(row.quantity * recipe(row.variety).ingredientCost) }];
  }
  // Charge ingredients for every baked cookie, even unsold ones; overhead is charged once.
  function cost(plan) {
    return money(batches(plan).reduce((sum, b) => sum + b.quantity * (recipe(b.variety)?.ingredientCost ?? NaN), 0) + plan.advertising + 5);
  }
  // Check rules here too, because browser input limits can be bypassed.
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
  function basketSize(roll) {
    // Chances for 1–8 cookies: 60%, 20%, 10%, 5%, 2.5%, 1.5%, 0.7%, 0.3%.
    const thresholds = [.6, .8, .9, .95, .975, .99, .997];
    return 1 + thresholds.filter(threshold => roll >= threshold).length;
  }
  function discountBasket(size, boostRoll, roundingRoll) {
    const target = Math.min(8, size * (1.2 + .4 * boostRoll));
    // For example, a target of 1.4 becomes 2 cookies 40% of the time, otherwise 1.
    return Math.floor(target) + (roundingRoll < target - Math.floor(target) ? 1 : 0);
  }
  // Here "visitors" means requested cookies, summed from all customer baskets.
  function allocateSales(list, visitors) {
    const sold = list.map(() => 0);
    let waiting = visitors;
    while (waiting > 0) {
      const available = list.map((b, i) => i).filter(i => sold[i] < list[i].quantity);
      if (!available.length) break;
      // Share demand across stocked recipes; higher prices can make buyers leave.
      const desired = available.map((i, position) => {
        const customers = Math.floor(waiting / available.length) + (position < waiting % available.length ? 1 : 0);
        return customers * Math.min(1, Math.exp(-.65 * (list[i].price - recipe(list[i].variety).suggestedPrice)));
      });
      // Give leftover whole cookies to the largest fractions, preserving the rounded total.
      const orders = desired.map(Math.floor);
      let remainder = Math.round(desired.reduce((sum, n) => sum + n, 0)) - orders.reduce((sum, n) => sum + n, 0);
      const order = desired.map((n, i) => i).sort((a, b) => (desired[b] - orders[b]) - (desired[a] - orders[a]));
      for (const i of order) if (remainder > 0) { orders[i]++; remainder--; }
      waiting = 0;
      available.forEach((i, position) => {
        const bought = Math.min(list[i].quantity - sold[i], orders[position]);
        sold[i] += bought;
        // Retry only orders blocked by stock; orders lost because of price do not return.
        waiting += orders[position] - bought;
      });
    }
    return sold;
  }
  function play(state, plan, random = Math.random) {
    const error = validate(state, plan);
    if (error) throw new Error(error);
    const list = batches(plan);
    // Advertising has diminishing returns; daily randomness changes traffic by about ±15%.
    const visitors = Math.round((32 + 13 * Math.sqrt(plan.advertising)) * events[state.event].multiplier * (.85 + random() * .3));
    const stocked = list.filter(b => b.quantity > 0);
    const baskets = Array.from({ length: visitors }, (_, i) => {
      const size = basketSize(random());
      // Assign preferences evenly; only a discounted preferred recipe boosts this basket.
      const preferred = stocked[i % stocked.length];
      return preferred && preferred.price < recipe(preferred.variety).suggestedPrice
        ? discountBasket(size, random(), random()) : size;
    });
    const allocated = allocateSales(list, baskets.reduce((sum, n) => sum + n, 0));
    const results = list.map((b, i) => {
      const sold = Math.min(b.quantity, allocated[i]);
      return { variety: recipe(b.variety).id, quantity: b.quantity, price: b.price, sold,
        revenue: money(sold * b.price), ingredients: money(b.quantity * recipe(b.variety).ingredientCost) };
    });
    const sold = results.reduce((sum, b) => sum + b.sold, 0);
    const quantity = results.reduce((sum, b) => sum + b.quantity, 0);
    const revenue = money(results.reduce((sum, b) => sum + b.revenue, 0));
    const expenses = cost(plan), profit = money(revenue - expenses);
    // Keep the visitor count and baskets so loading can check the same sales calculation.
    const row = { day: state.history.length + 1, salesModel: 3, visitors, baskets, quantity, advertising: plan.advertising, batches: results,
      ...(results.length === 1 ? { variety: results[0].variety, price: results[0].price } : {}),
      sold, revenue, expenses, profit, cash: money(state.cash + profit), event: state.event };
    return { version: 1, cash: row.cash, history: [...state.history, row], event: Math.min(events.length - 1, Math.floor(random() * events.length)) };
  }
  // Rebuild cash from $100 instead of trusting totals stored in the browser.
  // This checks save consistency; it cannot secure a player-controlled browser.
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
        // Model 2 allows one cookie per visitor; model 3 uses baskets of 1–8.
        if (row.salesModel !== undefined && ![2, 3].includes(row.salesModel)) return null;
        let expected;
        if (row.salesModel === 2 || row.salesModel === 3) {
          const traffic = (32 + 13 * Math.sqrt(row.advertising)) * events[row.event].multiplier;
          if (!Number.isInteger(row.visitors) || row.visitors < Math.round(traffic * .85) || row.visitors > Math.round(traffic * 1.15)) return null;
          if (row.salesModel === 3 && (!Array.isArray(row.baskets) || row.baskets.length !== row.visitors || row.baskets.some(n => !Number.isInteger(n) || n < 1 || n > 8))) return null;
          expected = allocateSales(list, row.salesModel === 3 ? row.baskets.reduce((sum, n) => sum + n, 0) : row.visitors);
        }
        let quantity = 0, sold = 0, revenue = 0;
        const normalized = [];
        const active = list.filter(b => b.quantity > 0).length;
        const maxTraffic = (32 + 13 * Math.sqrt(row.advertising)) * events[row.event].multiplier * 1.15;
        for (const [i, b] of list.entries()) {
          // Legacy saves have no baskets, so check their old maximum demand instead.
          const maxSales = b.quantity ? Math.ceil(maxTraffic / active * Math.exp(-.65 * (b.price - recipe(b.variety).suggestedPrice))) : 0;
          if (!Number.isInteger(b.sold) || (expected ? b.sold !== expected[i] : b.sold > maxSales) || b.sold < 0 || b.sold > b.quantity ||
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
        // Copy only known fields; keep the original sales model for older days.
        clean.history.push({ day: row.day, ...([2, 3].includes(row.salesModel) ? { salesModel: row.salesModel, visitors: row.visitors, ...(row.salesModel === 3 ? { baskets: [...row.baskets] } : {}) } : {}), quantity, advertising: row.advertising,
          ...(normalized.length === 1 ? { variety: normalized[0].variety, price: normalized[0].price } : {}),
          batches: normalized, sold, revenue, expenses, profit, cash, event: row.event });
        clean.cash = cash;
      }
      if (!isMoney(saved.cash) || !same(saved.cash, clean.cash)) return null;
      clean.event = saved.event;
      return clean;
    } catch (_) { return null; }
  }
  const api = Object.freeze({ events, varieties, recipe, breakdown, initial, cost, validate, play, restore, basketSize, discountBasket });
export default api;
