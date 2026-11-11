# Nguyen's Cookie Shop Cat

A cozy 30-day cookie shop game. Start with $100, choose your daily batch, price, and advertising budget, and grow your shop.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```sh
npm test          # Simulation, save integrity, and React UI regression tests
npm run build    # Static production build in dist/
npm run preview  # Preview the production build
```

The interface uses React and Tailwind CSS with Vite. Custom CSS is limited to the cat/shop illustrations and animations. No server or account is needed to play. Opening the source index.html directly from file:// is no longer supported; use the dev or preview server.

Saved games use the original `nguyen-cookie-shop-v1` key and remain compatible on the same browser origin. A file:// save or a save from another port is separate browser storage; retain the original browser tab if you need to copy that save before switching origins.

## Project layout

- `game.js`: unchanged game rules and save validation, exported as an ES module.
- `src/App.jsx`: React shop, controls, reports, and ledger.
- `src/CustomerScene.jsx`: customer animations with timer cleanup.
- `src/storage.js`: save/load and plan restoration.
- `src/styles.css`: Tailwind theme and custom illustration/animation CSS.

## How it works

- Bake any mix of classic chocolate chip ($0.50 ingredients, $2 suggested price), oatmeal raisin ($0.65, $2.25), and double chocolate ($0.90, $3). Each has its own daily quantity and selling price; quantity 0 skips a recipe.
- Advertising is shared. Daily overhead is $5, charged once alongside all ingredients and advertising before sales.
- Daily visitors are determined by advertising, the event, and random variation. Each visitor requests 1–8 cookies with decreasing probabilities: 60%, 20%, 10%, 5%, 2.5%, 1.5%, 0.7%, and 0.3%. When a visitor's preferred stocked recipe is priced below its suggested price, their requested basket gets a random 20–60% boost, rounded probabilistically to whole cookies and capped at 8. The cap and stock can make the actual increase smaller. Visitor counts are unchanged. Visitors are split evenly across stocked recipes; prices above the suggested price reduce conversion, while prices at or below it cannot increase conversion above 100%. Willing buyers whose preferred recipe sells out try another stocked recipe, subject to its price. Price refusals leave the shop. Sales use integer allocations and never exceed the total requested baskets or stock. New saved days record the visitor count, each requested basket size, and sales model for validation; legacy history keeps its original results.
- Reports and saved ledger days retain per-recipe quantities, prices, sales, ingredients and revenue, plus daily totals. Reload restores the last day's mixed plan and advertising. Original saves and earlier single-variety saves remain supported.
- All expenses are paid from your available cash before sales.
- Price, advertising, daily events, and small random fluctuations affect demand.
- Unsold cookies expire each day.
- Opening the shop plays a short customer animation: more sales bring more visitors, with grouped orders for busy days. Skip animation reveals the results immediately. Reduced-motion preferences are supported.
- Your run ends after 30 days or when you cannot afford daily overhead.
- Progress saves automatically when browser storage is available. New game resets it.

Run all checks with `npm test`.

## Save validation and local play

Saved games are treated as untrusted data. Loading reconciles each day's quantities, prices, sales, ingredient costs, shared expenses, profit, and cash from the initial $100. Invalid or inconsistent saves open a fresh shop with a visible notice. Input rules are also enforced in the simulation, not just by browser form attributes. Run all simulation and UI integration checks with `npm test`.

This is an offline, client-only game. These checks catch malformed and inconsistent edits; they cannot make a player-controlled browser cheat-proof. Players can still replace the JavaScript, restore an earlier save, or forge a plausible history. Trusted competitive scores would require a server to own the simulation and saves.
