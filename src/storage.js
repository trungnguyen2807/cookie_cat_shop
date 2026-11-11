import game from '../game.js';
// Keep the original key so earlier saves work on the same browser origin.
export const saveKey = 'nguyen-cookie-shop-v1';
export function loadGame() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw !== null) {
      const restored = game.restore(JSON.parse(raw));
      return { state: restored ?? game.initial(), rejected: !restored };
    }
  } catch (error) {
    // Invalid JSON shows a notice; blocked storage still allows a fresh game.
    if (error instanceof SyntaxError) return { state: game.initial(), rejected: true };
  }
  return { state: game.initial(), rejected: false };
}
export function saveGame(state) {
  try { localStorage.setItem(saveKey, JSON.stringify(state)); }
  catch { /* Storage may be blocked or full; keep the current game playable. */ }
}
// Restore the last menu; recipes missing from an old save start at zero.
export function restorePlan(row) {
  return {
    batches: game.varieties.map(v => {
      const b = row && game.breakdown(row).find(b => b.variety === v.id);
      return { variety: v.id, quantity: b ? b.quantity : row ? 0 : v.id === 'classic' ? 20 : 10, price: b ? b.price : v.suggestedPrice };
    }),
    advertising: row?.advertising ?? 5,
  };
}
