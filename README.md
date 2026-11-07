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

- Bake any mix of classic chocolate chip ($0.50 ingredients, $2 suggested price), oatmeal raisin ($0.65, $2.25), and double chocolate ($0.90, $3). Each has its own daily quantity and selling price; quantity 0 skips a recipe.
- Advertising is shared. Daily overhead is $5, charged once alongside all ingredients and advertising before sales.
- One shared traffic pool is split equally between stocked recipes, with price sensitivity relative to each recipe's suggested price. Allocations use largest remainders, so offering all three at suggested prices brings the same total demand as offering one. Customers whose preferred recipe sells out do not switch recipes.
- Reports and saved ledger days retain per-recipe quantities, prices, sales, ingredients and revenue, plus daily totals. Reload restores the last day's mixed plan and advertising. Original saves and earlier single-variety saves remain supported.
- All expenses are paid from your available cash before sales.
- Price, advertising, daily events, and small random fluctuations affect demand.
- Unsold cookies expire each day.
- Opening the shop plays a short customer animation: more sales bring more visitors, with grouped orders for busy days. Skip animation reveals the results immediately. Reduced-motion preferences are supported.
- Your run ends after 30 days or when you cannot afford daily overhead.
- Progress saves automatically when browser storage is available. New game resets it.

Run simulation checks with `node --test game.test.js`.

## Save validation and local play

Saved games are treated as untrusted data. Loading reconciles each day's quantities, prices, sales, ingredient costs, shared expenses, profit, and cash from the initial $100. Invalid or inconsistent saves open a fresh shop with a visible notice. Input rules are also enforced in the simulation, not just by browser form attributes. Run all simulation and UI integration checks with `node --test`.

This is an offline, client-only game. These checks catch malformed and inconsistent edits; they cannot make a player-controlled browser cheat-proof. Players can still replace the JavaScript, restore an earlier save, or forge a plausible history. Trusted competitive scores would require a server to own the simulation and saves.
