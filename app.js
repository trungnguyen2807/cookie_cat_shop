'use strict';
const $ = id => document.getElementById(id);
const game = window.CookieGame;
const saveKey = 'nguyen-cookie-shop-v1';
const currency = n => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
const inputIds = ['advertising', ...game.varieties.flatMap(v => [`quantity-${v.id}`, `price-${v.id}`])];
let state = game.initial();
let serving = false;
let customerTimers = [];
function stopCustomers() {
  customerTimers.forEach(clearTimeout);
  customerTimers = [];
  serving = false;
  $('customer-lane').replaceChildren();
}
function finishCustomers() {
  if (!serving) return;
  stopCustomers();
  $('skip-customers').hidden = true;
  $('scene-label').textContent = 'A SWEET DAY IN THE BOOKS';
  const row = state.history.at(-1);
  $('scene-counter').textContent = `${row.sold} cookies sold`;
  $('scene-caption').textContent = row.sold ? 'Happy customers, happy cat.' : 'A quiet day. Tomorrow is a fresh batch.';
  render();
}
function animateCustomers(row) {
  stopCustomers();
  serving = true;
  $('welcome').hidden = true;
  $('report').hidden = true;
  $('customer-scene').hidden = false;
  $('skip-customers').hidden = false;
  $('scene-label').textContent = `DAY ${row.day} · SHOP IS OPEN`;
  $('result-title').textContent = 'The neighbors are stopping by!';
  $('scene-counter').textContent = '0 cookies sold';
  $('scene-caption').textContent = row.sold ? 'Fresh cookies, coming right up…' : 'Waiting for a cookie craving…';
  updateEstimate();
  for (const id of inputIds) $(id).disabled = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('customer-scene').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
  // More sales mean more visitors; group large orders to keep the scene short.
  const count = Math.min(18, Math.ceil(row.sold / 4));
  const animals = ['🐰', '🐻', '🐱', '🐼', '🦊', '🐶'];
  let served = 0;
  const later = (fn, delay) => customerTimers.push(setTimeout(fn, delay));
  for (let i = 0; i < count; i++) {
    const cookies = Math.floor(row.sold / count) + (i < row.sold % count ? 1 : 0);
    later(() => {
      const visitor = document.createElement('div');
      visitor.className = `customer${reduced ? ' still-customer' : ''}`;
      visitor.style.setProperty('--lane', `${(i % 3) * 13}px`);
      visitor.style.setProperty('--coat', ['#d8b5ce', '#a6bda7', '#e8bc76'][i % 3]);
      visitor.innerHTML = `<span class="purchase">♡ +${cookies} 🍪</span><span class="customer-animal">${animals[i % animals.length]}</span><span class="customer-coat"></span><span class="cookie-bag">🛍️</span>`;
      $('customer-lane').append(visitor);
      later(() => {
        served += cookies;
        $('scene-counter').textContent = `${served} / ${row.sold} cookies sold`;
        $('scene-caption').textContent = `“Thank you!” · ${cookies} cookies to go`;
      }, reduced ? 100 : 1200);
      later(() => visitor.remove(), reduced ? 500 : 3000);
    }, i * (reduced ? 100 : 240));
  }
  later(finishCustomers, count ? (count - 1) * (reduced ? 100 : 240) + (reduced ? 700 : 3100) : 1800);
}
let saveRejected = false;
try {
  const raw = localStorage.getItem(saveKey);
  if (raw !== null) {
    let saved;
    try { saved = JSON.parse(raw); } catch (_) { saveRejected = true; }
    const restored = game.restore(saved);
    if (restored) state = restored;
    else saveRejected = true;
  }
} catch (_) { /* Storage may be unavailable or contain malformed JSON. */ }

function plan() { return { batches: game.varieties.map(v => ({ variety: v.id, quantity: $(`quantity-${v.id}`).valueAsNumber, price: $(`price-${v.id}`).valueAsNumber })), advertising: $('advertising').valueAsNumber }; }
function restorePlan(row) {
  for (const v of game.varieties) {
    const b = row && game.breakdown(row).find(b => b.variety === v.id);
    $(`quantity-${v.id}`).value = b ? b.quantity : row ? 0 : v.id === 'classic' ? 20 : 10;
    $(`price-${v.id}`).value = b ? b.price : v.suggestedPrice;
  }
  $('advertising').value = row && Number.isFinite(row.advertising) ? row.advertising : 5;
}
function recipeSummary(row) {
  return game.breakdown(row).map(b => `${game.recipe(b.variety).name}: ${b.quantity} / ${b.sold} @ ${currency(b.price)}`).join('<br>');
}
function finished() { return state.history.length >= 30 || state.cash < 5; }
function updateEstimate() {
  const p = plan();
  const ingredients = p.batches.reduce((sum, b) => sum + (Number.isFinite(b.quantity) ? b.quantity * game.recipe(b.variety).ingredientCost : 0), 0);
  $('ingredient-cost').textContent = currency(ingredients);
  $('ad-cost').textContent = currency(Number.isFinite(p.advertising) ? p.advertising : 0);
  $('total-cost').textContent = currency(Number.isFinite(game.cost(p)) ? game.cost(p) : 0);
  const error = game.validate(state, p);
  $('validation').textContent = finished() ? '' : error;
  $('bake').disabled = serving || Boolean(error);
}
function showReport() {
  const row = state.history.at(-1);
  if (!row || serving) return;
  $('welcome').hidden = true;
  $('report').hidden = false;
  const ended = finished();
  $('result-title').textContent = ended ? (state.history.length === 30 ? '30 days. One sweet journey.' : 'Time to hang up the apron.') : `Day ${row.day}, fresh from the oven.`;
  const total = state.cash - 100;
  const message = ended
    ? `You finished with ${currency(state.cash)} and ${total >= 0 ? 'earned' : 'lost'} ${currency(Math.abs(total))}. ${state.history.length === 30 ? 'Your 30-day shop adventure is complete!' : 'There is not enough cash for the $5 daily overhead.'} Start a new game to try another strategy.`
    : row.quantity === 0 ? 'A quiet day at the shop. You still paid overhead and any advertising.'
    : row.sold === row.quantity ? 'Sold out! A bigger batch could help you reach more hungry neighbors.'
    : `${row.quantity - row.sold} cookies left over. Try a smaller batch, a lower price, or a little more advertising tomorrow.`;
  $('report').innerHTML = `<div class="report-hero"><strong class="${row.profit < 0 ? 'negative' : ''}">${row.profit >= 0 ? '+' : '−'}${currency(Math.abs(row.profit))}</strong><span>day ${row.day} net profit</span></div><div class="table-scroll"><table class="recipe-results"><thead><tr><th>Recipe</th><th>Baked / sold</th><th>Price</th><th>Ingredients</th><th>Revenue</th></tr></thead><tbody>${game.breakdown(row).map(b => `<tr><td>${game.recipe(b.variety).name}</td><td>${b.quantity} / ${b.sold}</td><td>${currency(b.price)}</td><td>${currency(b.ingredients)}</td><td>${currency(b.revenue)}</td></tr>`).join('')}</tbody></table></div><div class="report-row"><span>Shared advertising / overhead</span><b>${currency(row.advertising ?? 0)} / $5.00</b></div><div class="report-row"><span>Cookies sold</span><b>${row.sold} / ${row.quantity}</b></div><div class="report-row"><span>Revenue</span><b>${currency(row.revenue)}</b></div><div class="report-row"><span>Expenses</span><b>${currency(row.expenses)}</b></div><div class="report-row"><span>Remaining cash</span><b>${currency(row.cash)}</b></div><p class="report-note">${message}</p>${ended ? '<button class="primary" id="play-again">Start a fresh shop <span>↗</span></button>' : ''}`;
  if (ended) $('play-again').addEventListener('click', restart);
}
function render() {
  const day = Math.min(30, state.history.length + 1);
  $('cash').textContent = currency(state.cash);
  $('day').innerHTML = `Day ${day} <small>/ 30</small>`;
  $('profit').textContent = currency(state.cash - 100);
  $('profit').className = state.cash >= 100 ? 'positive' : 'negative';
  $('sold').innerHTML = `${state.history.reduce((sum, row) => sum + row.sold, 0)} <small>cookies</small>`;
  $('day-badge').textContent = finished() ? 'COMPLETE' : `DAY ${String(day).padStart(2, '0')}`;
  $('plan-title').textContent = finished() ? 'Your shop is closed' : 'Plan your day';
  const event = game.events[state.event];
  $('event-icon').textContent = event.icon;
  $('event-title').textContent = finished() ? 'Thanks for baking with us' : event.title;
  $('event-copy').textContent = finished() ? 'A new adventure is only a fresh batch away.' : event.copy;
  for (const id of inputIds) $(id).disabled = finished();
  $('ledger-count').textContent = `${state.history.length} ${state.history.length === 1 ? 'day' : 'days'} in the books`;
  $('ledger-body').innerHTML = state.history.length ? [...state.history].reverse().map(r => `<tr><td>${String(r.day).padStart(2, '0')}</td><td>${recipeSummary(r)}</td><td>${r.quantity} / ${r.sold}</td><td>${currency(r.revenue)}</td><td>${currency(r.expenses)}</td><td class="${r.profit >= 0 ? 'positive' : 'negative'}">${currency(r.profit)}</td><td>${currency(r.cash)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Your first chapter is still in the oven.</td></tr>';
  updateEstimate();
  showReport();
}
function restart() {
  if (state.history.length && !finished() && !window.confirm('Start over with $100? Your current shop progress will be cleared.')) return;
  stopCustomers();
  $('customer-scene').hidden = true;
  state = game.initial();
  restorePlan();
  $('welcome').hidden = false; $('report').hidden = true;
  $('result-title').textContent = 'Every great shop starts small.';
  save(); render();
}
function save() { try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (_) { /* Continue without persistent storage. */ } }
$('plan-form').addEventListener('input', updateEstimate);
$('plan-form').addEventListener('submit', event => {
  event.preventDefault();
  if (serving) return;
  const error = game.validate(state, plan());
  if (error) { $('validation').textContent = error; return; }
  state = game.play(state, plan());
  save(); render();
  animateCustomers(state.history.at(-1));
});
$('skip-customers').addEventListener('click', finishCustomers);
$('restart').addEventListener('click', restart);
restorePlan(state.history.at(-1));
render();

if (saveRejected) {
  const notice = document.createElement('p');
  notice.className = 'report-note';
  notice.setAttribute('role', 'status');
  notice.textContent = 'This saved game contains invalid or inconsistent data. A fresh shop has been opened.';
  $('welcome').prepend(notice);
}
