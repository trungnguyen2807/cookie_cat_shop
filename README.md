# Nguyen's Cookie Shop Cat

A cozy 30-day cookie shop game. Start with $100, choose your daily batch, price, and advertising budget, and grow your shop.

## Run locally

Open `index.html` in your web browser. No installation, dependencies, or build step needed.

Alternatively, serve this folder:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## How it works

- Ingredients cost $0.50 per cookie; daily overhead is $5.
- All expenses are paid from your available cash before sales.
- Price, advertising, daily events, and small random fluctuations affect demand.
- Unsold cookies expire each day.
- Opening the shop plays a short customer animation: more sales bring more visitors, with grouped orders for busy days. Skip animation reveals the results immediately. Reduced-motion preferences are supported.
- Your run ends after 30 days or when you cannot afford daily overhead.
- Progress saves automatically when browser storage is available. New game resets it.

Run simulation checks with `node --test game.test.js`.
