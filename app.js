'use strict';
const $ = id => document.getElementById(id);
const game = window.CookieGame;
const saveKey = 'nguyen-cookie-shop-v1';
const currency = n => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
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
  $('scene-label').textContent = `DAY ${row.day} · ${game.recipe(row.variety).name.toUpperCase()}`;
  $('result-title').textContent = 'The neighbors are stopping by!';
  $('scene-counter').textContent = '0 cookies sold';
  $('scene-caption').textContent = row.sold ? 'Fresh cookies, coming right up…' : 'Waiting for a cookie craving…';
  updateEstimate();
  for (const id of ['variety', 'quantity', 'price', 'advertising']) $(id).disabled = true;
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
        $('scene-caption').textContent = `“Thank you!” · ${cookies} ${game.recipe(row.variety).name.toLowerCase()} cookies to go`;
      }, reduced ? 100 : 1200);
      later(() => visitor.remove(), reduced ? 500 : 3000);
    }, i * (reduced ? 100 : 240));
  }
  later(finishCustomers, count ? (count - 1) * (reduced ? 100 : 240) + (reduced ? 700 : 3100) : 1800);
}
try {
  const saved = JSON.parse(localStorage.getItem(saveKey));
  if (saved?.version === 1 && Number.isFinite(saved.cash) && saved.cash >= 0 && Array.isArray(saved.history) && saved.history.length <= 30 && Number.isInteger(saved.event) && game.events[saved.event] && saved.history.every(r => game.recipe(r.variety) && ['day', 'quantity', 'sold', 'revenue', 'expenses', 'profit', 'cash'].every(k => Number.isFinite(r[k])))) state = saved;
} catch (_) { /* Storage is optional; the game also works from a local file. */ }
function plan() { return { variety: $('variety').value, quantity: $('quantity').valueAsNumber, price: $('price').valueAsNumber, advertising: $('advertising').valueAsNumber }; }
function finished() { return state.history.length >= 30 || state.cash < 5; }
function updateEstimate() {
  const p = plan();
  const recipe = game.recipe(p.variety);
  $('unit-cost').textContent = `${currency(recipe.ingredientCost)} / cookie`;
  $('variety-tip').textContent = `Suggested price ${currency(recipe.suggestedPrice)} · bake one variety each day.`;
  $('ingredient-cost').textContent = currency(Number.isFinite(p.quantity) ? p.quantity * recipe.ingredientCost : 0);
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
  $('report').innerHTML = `<div class="report-hero"><strong class="${row.profit < 0 ? 'negative' : ''}">${row.profit >= 0 ? '+' : '−'}${currency(Math.abs(row.profit))}</strong><span>day ${row.day} net profit</span></div><div class="report-row"><span>Cookie variety</span><b>${game.recipe(row.variety).name}</b></div><div class="report-row"><span>Cookies sold</span><b>${row.sold} / ${row.quantity}</b></div><div class="report-row"><span>Revenue</span><b>${currency(row.revenue)}</b></div><div class="report-row"><span>Expenses</span><b>${currency(row.expenses)}</b></div><div class="report-row"><span>Remaining cash</span><b>${currency(row.cash)}</b></div><p class="report-note">${message}</p>${ended ? '<button class="primary" id="play-again">Start a fresh shop <span>↗</span></button>' : ''}`;
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
  for (const id of ['variety', 'quantity', 'price', 'advertising']) $(id).disabled = finished();
  $('ledger-count').textContent = `${state.history.length} ${state.history.length === 1 ? 'day' : 'days'} in the books`;
  $('ledger-body').innerHTML = state.history.length ? [...state.history].reverse().map(r => `<tr><td>${String(r.day).padStart(2, '0')}</td><td>${game.recipe(r.variety).name}</td><td>${r.quantity} / ${r.sold}</td><td>${currency(r.revenue)}</td><td>${currency(r.expenses)}</td><td class="${r.profit >= 0 ? 'positive' : 'negative'}">${currency(r.profit)}</td><td>${currency(r.cash)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Your first chapter is still in the oven.</td></tr>';
  updateEstimate();
  showReport();
}
function restart() {
  if (state.history.length && !finished() && !window.confirm('Start over with $100? Your current shop progress will be cleared.')) return;
  stopCustomers();
  $('customer-scene').hidden = true;
  state = game.initial();
  $('variety').value = 'classic';
  $('quantity').value = 40; $('price').value = 2; $('advertising').value = 5;
  $('welcome').hidden = false; $('report').hidden = true;
  $('result-title').textContent = 'Every great shop starts small.';
  save(); render();
}
function save() { try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (_) { /* Continue without persistent storage. */ } }
$('variety').addEventListener('change', () => {
  $('price').value = game.recipe($('variety').value).suggestedPrice;
  updateEstimate();
});
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
const lastDay = state.history.at(-1);
if (lastDay) {
  $('variety').value = game.recipe(lastDay.variety).id;
  $('price').value = Number.isFinite(lastDay.price) ? lastDay.price : game.recipe(lastDay.variety).suggestedPrice;
}
render();
