import { useCallback, useRef, useState } from 'react';
import game from '../game.js';
import { loadGame, restorePlan, saveGame } from './storage.js';
import CustomerScene from './CustomerScene.jsx';

const currency = n => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
const panel = 'min-w-0 rounded-2xl border border-line bg-[#fffdf8] p-5 shadow-[0_8px_30px_#6b482609] sm:p-7';
const eyebrow = 'mb-3 text-[10px] font-bold tracking-[1.7px] text-rust';
const heading = 'font-serif text-[27px] leading-tight tracking-tight';
const primary = 'flex min-h-12 w-full items-center justify-between rounded-lg bg-rust px-4 py-3 text-[13px] font-semibold text-white shadow-[0_3px_0_#813e28] transition hover:-translate-y-0.5 hover:bg-[#984329] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#c7b9a8] disabled:shadow-none motion-reduce:transition-none';
const finished = state => state.history.length >= 30 || state.cash < 5;

function NumberField({ id, label, value, onChange, price = false, disabled }) {
  return <div className="min-w-0"><label htmlFor={id} className="mb-2 mt-3 block text-xs font-semibold">{label}</label><div className="flex h-12 items-center gap-2 rounded-lg border border-[#ddd4c5] bg-[#fffcf6] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ba7854]">
    {price && <span className="text-xs text-muted">$</span>}<input id={id} type="number" className="w-full min-w-0 bg-transparent font-serif text-lg disabled:text-muted" min={price ? .25 : 0} max={price ? 20 : 10000} step={price ? .25 : 1} required value={Number.isNaN(value) ? '' : value} disabled={disabled} onChange={e => onChange(e.target.valueAsNumber)} />{!price && id !== 'advertising' && <span className="text-xs text-muted">cookies</span>}
  </div></div>;
}
function Illustration() {
  return <div className="illustration" aria-label="A cat behind a cookie shop counter" role="img"><div className="shop-sign">fresh cookies, happy cats</div><span className="shop-sparkle sparkle-one" aria-hidden="true">✦</span><span className="shop-sparkle sparkle-two" aria-hidden="true">✧</span><div className="cat"><span className="ears">▲ ▲</span><span className="face">• ᴥ •</span><span className="cat-cheeks" aria-hidden="true" /><span className="apron">N</span></div><div className="cookie c1">●</div><div className="cookie c2">●</div><div className="counter"><span>BAKED WITH LOVE</span><b>✦</b></div></div>;
}
function Report({ row, state, onRestart }) {
  const ended = finished(state), total = state.cash - 100;
  const message = ended ? `You finished with ${currency(state.cash)} and ${total >= 0 ? 'earned' : 'lost'} ${currency(Math.abs(total))}. ${state.history.length === 30 ? 'Your 30-day shop adventure is complete!' : 'There is not enough cash for the $5 daily overhead.'} Start a new game to try another strategy.` : row.quantity === 0 ? 'A quiet day at the shop. You still paid overhead and any advertising.' : row.sold === row.quantity ? 'Sold out! A bigger batch could help you reach more hungry neighbors.' : `${row.quantity - row.sold} cookies left over. Try a smaller batch, a lower price, or a little more advertising tomorrow.`;
  return <div id="report"><div className="py-6 text-center"><strong className={`block font-serif text-5xl ${row.profit < 0 ? 'text-[#b24c39]' : 'text-sage'}`}>{row.profit >= 0 ? '+' : '−'}{currency(Math.abs(row.profit))}</strong><span className="text-[11px] text-muted">day {row.day} net profit</span></div>
    <div className="overflow-x-auto"><table className="w-full text-right text-[10px]"><thead className="border-y border-line bg-[#f9f4ea] text-muted"><tr>{['Recipe', 'Baked / sold', 'Price', 'Ingredients', 'Revenue'].map(h => <th key={h} className="p-2 font-normal first:text-left">{h}</th>)}</tr></thead><tbody>{game.breakdown(row).map(b => <tr key={b.variety} className="border-b border-line"><td className="min-w-24 p-2 text-left">{game.recipe(b.variety).name}</td><td className="whitespace-nowrap p-2">{b.quantity} / {b.sold}</td><td className="p-2">{currency(b.price)}</td><td className="p-2">{currency(b.ingredients)}</td><td className="p-2">{currency(b.revenue)}</td></tr>)}</tbody></table></div>
    {[['Shared advertising / overhead', `${currency(row.advertising ?? 0)} / $5.00`], ['Cookies sold', `${row.sold} / ${row.quantity}`], ['Revenue', currency(row.revenue)], ['Expenses', currency(row.expenses)], ['Remaining cash', currency(row.cash)]].map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-line py-3 text-xs"><span className="text-muted">{label}</span><b>{value}</b></div>)}
    <p className="my-4 border-l-3 border-[#c89461] bg-[#f4eee1] p-3 text-xs leading-7 text-[#7e6a51]">{message}</p>{ended && <button className={primary} onClick={onRestart}>Start a fresh shop <span>↗</span></button>}
  </div>;
}
export default function App() {
  // Load once; normal React renders should not read or reset saved progress.
  const [loaded] = useState(loadGame);
  const [state, setState] = useState(loaded.state);
  const [plan, setPlan] = useState(() => restorePlan(loaded.state.history.at(-1)));
  const [rejected, setRejected] = useState(loaded.rejected);
  const [serving, setServing] = useState(false);
  const [sceneDay, setSceneDay] = useState(null);
  // Block a second submit immediately, before React disables the button.
  const busy = useRef(false);
  const row = state.history.at(-1), ended = finished(state);
  const event = game.events[state.event], day = Math.min(30, state.history.length + 1);
  const error = game.validate(state, plan);
  const ingredientCost = plan.batches.reduce((sum, b) => sum + (Number.isFinite(b.quantity) ? b.quantity * game.recipe(b.variety).ingredientCost : 0), 0);
  // A stable callback keeps animation timers from restarting on each render.
  const finishCustomers = useCallback(() => { busy.current = false; setServing(false); }, []);
  function submit(e) {
    e.preventDefault();
    if (busy.current || game.validate(state, plan)) return;
    busy.current = true;
    const next = game.play(state, plan);
    // Save the result before animation so reloading cannot replay the same day.
    saveGame(next); setState(next); setSceneDay(next.history.at(-1)); setServing(true);
  }
  function restart() {
    if (state.history.length && !ended && !window.confirm('Start over with $100? Your current shop progress will be cleared.')) return;
    const next = game.initial();
    busy.current = false; setServing(false); setSceneDay(null); setRejected(false);
    setState(next); setPlan(restorePlan()); saveGame(next);
  }
  function changeBatch(i, key, value) { setPlan(p => ({ ...p, batches: p.batches.map((b, index) => index === i ? { ...b, [key]: value } : b) })); }
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-7 lg:px-10">
    <header className="flex h-20 items-center justify-between border-b border-line sm:h-23"><a href="./" className="flex items-center gap-3 text-3xl"><span aria-hidden="true">🐾</span><span className="text-[10px] tracking-[2px]">NGUYEN'S <b className="block text-xs tracking-widest">COOKIE SHOP CAT</b></span></a><button onClick={restart} className="rounded-lg p-2 text-xs text-muted hover:bg-[#eee3d2]">New game ↗</button></header>
    <section className="flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center sm:py-12"><div><p className={eyebrow}>SMALL SHOP. BIG COOKIE DREAMS.</p><h1 className="mb-5 font-serif text-[45px] leading-[1.07] tracking-[-2px] lg:text-[58px]">A little dough.<br />A lot of possibility.</h1><p className="text-[13px] leading-7 text-muted sm:text-sm">30 days to turn $100 into a thriving cookie shop.<br />Your whiskered business partner is counting on you.</p></div><Illustration /></section>
    <section aria-label="Shop overview" className="mb-7 grid grid-cols-2 gap-y-5 rounded-2xl border border-line bg-[#fffcf5] py-6 shadow-[0_8px_30px_#6b482609] md:grid-cols-4">{[
      ['YOUR CASH', currency(state.cash), 'cash'], ['SHOP CALENDAR', <>Day {day} <small className="text-sm text-muted">/ 30</small></>, 'day'], ['TOTAL PROFIT', currency(state.cash - 100), 'profit'], ['COOKIES SOLD', <>{state.history.reduce((s, r) => s + r.sold, 0)} <small className="text-sm text-muted">cookies</small></>, 'sold'],
    ].map(([label, value, id], i) => <div key={id} className={`px-5 md:border-r md:last:border-0 ${i % 2 === 0 ? 'border-r border-line' : ''}`}><span className="mb-2 block text-[9px] font-semibold tracking-widest text-muted">{label}</span><strong id={id} className={`font-serif text-[27px] font-normal ${id === 'cash' || id === 'profit' && state.cash >= 100 ? 'text-sage' : id === 'profit' ? 'text-[#b24c39]' : ''}`}>{value}</strong></div>)}</section>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.05fr_1fr]">
      <section className={`${panel} border-t-3 border-t-[#c58861]`}><div className="flex items-center justify-between gap-3"><div><p className={eyebrow}>LET'S GET BAKING</p><h2 className={heading}>{ended ? 'Your shop is closed' : 'Plan your day'}</h2></div><span className="rounded-md border border-line bg-[#f7efe0] p-2 text-[9px] font-bold text-muted">{ended ? 'COMPLETE' : `DAY ${String(day).padStart(2, '0')}`}</span></div>
        <div className="my-6 flex gap-3 rounded-lg border border-[#e0e5d5] bg-[#f0f2e7] p-4"><span className="text-2xl text-[#7b8a57]">{event.icon}</span><div><b className="text-xs text-[#4f6042]">{ended ? 'Thanks for baking with us' : event.title}</b><p className="mt-1 text-[11px] leading-5 text-[#768067]">{ended ? 'A new adventure is only a fresh batch away.' : event.copy}</p></div></div>
        <form onSubmit={submit} aria-label="Daily baking plan"><p className="text-[11px] leading-5 text-muted">Bake any mix each day. Set a quantity to 0 to skip that recipe.</p>{game.varieties.map((v, i) => <fieldset key={v.id} className="my-5 min-w-0 rounded-lg border border-line p-3"><legend className="px-1 text-[13px] font-semibold">{v.name}</legend><p className="text-[10px] leading-5 text-muted">{currency(v.ingredientCost)} ingredients / cookie · suggested price {currency(v.suggestedPrice)}</p><div className="grid grid-cols-2 gap-3"><NumberField id={`quantity-${v.id}`} label="Cookies to bake" value={plan.batches[i].quantity} disabled={ended || serving} onChange={n => changeBatch(i, 'quantity', n)} /><NumberField id={`price-${v.id}`} label="Price per cookie" value={plan.batches[i].price} price disabled={ended || serving} onChange={n => changeBatch(i, 'price', n)} /></div></fieldset>)}
          <NumberField id="advertising" label="Advertising budget" value={plan.advertising} disabled={ended || serving} onChange={n => setPlan(p => ({ ...p, advertising: n }))} />
          <div className="mt-6">{[['Ingredients', currency(ingredientCost)], ['Advertising', currency(Number.isFinite(plan.advertising) ? plan.advertising : 0)], ['Daily overhead', '$5.00'], ["Today's investment", currency(Number.isFinite(game.cost(plan)) ? game.cost(plan) : 0)]].map(([label, value], i) => <div key={label} className={`flex justify-between py-2 text-xs ${i === 3 ? 'mt-2 border-t border-dashed border-line text-sm font-semibold' : 'text-muted'}`}><span>{label}</span><b className="text-ink">{value}</b></div>)}</div>
          <p role="status" className="my-3 min-h-4 text-xs text-[#ae4434]">{ended ? '' : error}</p><button type="submit" className={primary} disabled={serving || Boolean(error)}>Open shop & bake <span>→</span></button><p className="mt-3 text-center text-[11px] text-muted">Fresh daily. Unsold cookies don't carry over.</p>
        </form>
      </section>
      <section className={`${panel} flex flex-col border-t-3 border-t-[#83957a]`} aria-live="polite"><p className={eyebrow}>THE DAILY CRUMB</p><h2 className={heading}>{serving ? 'The neighbors are stopping by!' : !row ? 'Every great shop starts small.' : ended ? state.history.length === 30 ? '30 days. One sweet journey.' : 'Time to hang up the apron.' : `Day ${row.day}, fresh from the oven.`}</h2>
        {!row && <div className="my-auto text-center">{rejected && <p role="status" className="my-5 rounded-lg bg-[#f4eee1] p-3 text-xs text-[#7e6a51]">This saved game contains invalid or inconsistent data. A fresh shop has been opened.</p>}<div className="mx-auto my-7 grid h-32 w-32 place-items-center rounded-full border border-dashed border-[#ddc49d] bg-[#fbf1da] text-7xl">🍪</div><p className="text-xs leading-7 text-muted">Set your recipe for success on the left,<br />then open your doors for the day.</p><div className="mt-7 rounded-lg border border-line bg-[#faf3e7] p-4 text-left"><b className="text-xs text-rust">Cat's business tip</b><p className="mt-2 text-xs leading-7 text-muted">A higher price earns more per cookie, but fewer customers will bite. Advertising helps spread the word.</p></div></div>}
        {sceneDay && <CustomerScene key={sceneDay.day} row={sceneDay} serving={serving} onFinish={finishCustomers} />}{row && !serving && <Report row={row} state={state} onRestart={restart} />}
      </section>
    </div>
    <section className={`${panel} mt-6`}><div className="flex items-center justify-between gap-2"><div><p className={eyebrow}>YOUR SHOP'S STORY</p><h2 className={heading}>Daily ledger</h2></div><span className="text-right text-[11px] text-muted">{state.history.length} {state.history.length === 1 ? 'day' : 'days'} in the books</span></div><div className="mt-6 overflow-x-auto"><table className="w-full text-right text-xs"><thead className="border-y border-line bg-[#f9f4ea] text-[10px] text-muted"><tr>{['Day', 'Recipe breakdown · baked / sold @ price', 'Baked / sold', 'Revenue', 'Expenses', 'Profit', 'Cash'].map(h => <th key={h} className="whitespace-nowrap p-3 font-normal first:text-left">{h}</th>)}</tr></thead><tbody>{!row ? <tr><td colSpan={7} className="p-8 text-center text-muted">Your first chapter is still in the oven.</td></tr> : [...state.history].reverse().map(r => <tr key={r.day} className="border-b border-line hover:bg-[#faf4e9]"><td className="p-3 text-left">{String(r.day).padStart(2, '0')}</td><td className="min-w-55 p-3 text-left leading-6">{game.breakdown(r).map(b => <div key={b.variety}>{game.recipe(b.variety).name}: {b.quantity} / {b.sold} @ {currency(b.price)}</div>)}</td><td className="whitespace-nowrap p-3">{r.quantity} / {r.sold}</td><td className="p-3">{currency(r.revenue)}</td><td className="p-3">{currency(r.expenses)}</td><td className={`p-3 ${r.profit >= 0 ? 'text-sage' : 'text-[#b24c39]'}`}>{currency(r.profit)}</td><td className="p-3">{currency(r.cash)}</td></tr>)}</tbody></table></div></section>
    <footer className="flex justify-between gap-4 py-7 text-[10px] text-muted"><span>Nguyen's Cookie Shop Cat</span><span>A cozy little business adventure. 🐾</span></footer>
  </main>;
}
