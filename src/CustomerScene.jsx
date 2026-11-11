import { useEffect, useRef, useState } from 'react';

const animals = ['🐰', '🐻', '🐱', '🐼', '🦊', '🐶'];
export default function CustomerScene({ row, serving, onFinish }) {
  const [visitors, setVisitors] = useState([]);
  const [served, setServed] = useState(0);
  const [lastOrder, setLastOrder] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!serving) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView?.({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
    const timers = [];
    const later = (fn, delay) => timers.push(setTimeout(fn, delay));
    // Show at most 18 representative groups, not one character per real customer.
    const count = Math.min(18, Math.ceil(row.sold / 4));
    const interval = reduced ? 100 : 240;
    setVisitors([]); setServed(0); setLastOrder(0);
    for (let i = 0; i < count; i++) {
      // Spread all sold cookies across the groups without losing the remainder.
      const cookies = Math.floor(row.sold / count) + (i < row.sold % count ? 1 : 0);
      later(() => {
        setVisitors(v => [...v, { id: i, cookies, reduced }]);
        later(() => { setServed(s => s + cookies); setLastOrder(cookies); }, reduced ? 100 : 1200);
        later(() => setVisitors(v => v.filter(item => item.id !== i)), reduced ? 500 : 3000);
      }, i * interval);
    }
    later(onFinish, count ? (count - 1) * interval + (reduced ? 700 : 3100) : 1800);
    // Cancel pending updates when skipping, restarting, or leaving this scene.
    return () => timers.forEach(clearTimeout);
  }, [row, serving, onFinish]);
  return <section ref={ref} className="mt-5 overflow-hidden rounded-xl border border-line bg-[#fbf5e8]" aria-label="Customers visiting the cookie shop">
    <div className="flex items-center justify-between gap-2 p-3"><span className="text-[9px] font-bold tracking-widest text-sage">{serving ? `DAY ${row.day} · SHOP IS OPEN` : 'A SWEET DAY IN THE BOOKS'}</span>{serving && <button type="button" onClick={onFinish} className="rounded p-1 text-[10px] text-muted hover:bg-[#eee3d2]">Skip animation →</button>}</div>
    <div className="relative h-[190px] overflow-hidden bg-[linear-gradient(#e4ead8_0_72%,#c5bb9f_72%_75%,#eae0cd_75%)]" aria-hidden="true">
      <div className="tiny-shop"><div className="awning" /><span className="shop-cat">🐱</span><div className="shop-desk">🍪 NGUYEN'S 🍪</div></div>
      <div className="customer-lane">{serving && visitors.map(v => <div key={v.id} className={`customer${v.reduced ? ' still-customer' : ''}`} style={{ '--lane': `${v.id % 3 * 13}px`, '--coat': ['#d8b5ce', '#a6bda7', '#e8bc76'][v.id % 3] }}><span className="purchase">♡ +{v.cookies} 🍪</span><span className="customer-animal">{animals[v.id % animals.length]}</span><span className="customer-coat" /><span className="cookie-bag">🛍️</span></div>)}</div><span className="street-plant">🪴</span>
    </div>
    <div className="flex min-h-13 flex-wrap justify-between gap-2 p-3 text-[11px]"><b className="text-sage">{serving ? `${served} / ${row.sold}` : row.sold} cookies sold</b><span className="text-muted">{serving ? lastOrder ? `“Thank you!” · ${lastOrder} cookies to go` : row.sold ? 'Fresh cookies, coming right up…' : 'Waiting for a cookie craving…' : row.sold ? 'Happy customers, happy cat.' : 'A quiet day. Tomorrow is a fresh batch.'}</span></div>
  </section>;
}
