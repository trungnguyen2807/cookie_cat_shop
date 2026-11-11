import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.jsx';
import game from '../game.js';
import { saveKey } from './storage.js';

// Reset browser state so one test cannot affect another.
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const form = () => screen.getByRole('form', { name: 'Daily baking plan' });
const saved = () => JSON.parse(localStorage.getItem(saveKey));
const field = id => document.getElementById(id);
function start() { fireEvent.submit(form()); }
function skip() { fireEvent.click(screen.getByRole('button', { name: 'Skip animation →' })); }

describe('React gameplay parity', () => {
  it('renders all recipes with separate prices and combined expenses', () => {
    render(<App />);
    for (const recipe of game.varieties) {
      expect(field(`quantity-${recipe.id}`)).toBeTruthy();
      expect(Number(field(`price-${recipe.id}`).value)).toBe(recipe.suggestedPrice);
    }
    expect(screen.getByText('$35.50')).toBeTruthy();
    fireEvent.change(field('quantity-classic'), { target: { value: '10000' } });
    expect(screen.getByRole('button', { name: /Open shop/ }).disabled).toBe(true);
    start(); expect(localStorage.getItem(saveKey)).toBe(null);
  });
  it('saves one day on repeated submit, locks inputs, then shows recipe results and ledger', () => {
    render(<App />);
    start(); const first = saved(); start();
    expect(saved()).toEqual(first);
    expect(field('quantity-classic').disabled).toBe(true);
    expect(first.history[0].batches).toHaveLength(3);
    skip();
    expect(field('quantity-classic').disabled).toBe(false);
    expect(screen.getByText('Day 1, fresh from the oven.')).toBeTruthy();
    expect(screen.getByText('1 day in the books')).toBeTruthy();
    expect(within(document.getElementById('report')).getByText('Double chocolate')).toBeTruthy();
    expect(document.getElementById('cash').textContent).toBe(new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(first.cash));
  });
  it('finishes animation automatically and cancels old timers on restart', () => {
    // Advance animation time instantly; the test does not need real waiting.
    vi.useFakeTimers(); vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />); start();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText('Day 1, fresh from the oven.')).toBeTruthy();
    start(); fireEvent.click(screen.getByRole('button', { name: 'New game ↗' }));
    act(() => vi.runAllTimers());
    expect(saved().history).toHaveLength(0);
    expect(document.getElementById('cash').textContent).toBe('$100.00');
    expect(screen.queryByLabelText('Customers visiting the cookie shop')).toBe(null);
  });
  it('restores a valid mixed save and last plan after reload', () => {
    const p = { batches: game.varieties.map(v => ({ variety: v.id, quantity: 8, price: v.suggestedPrice })), advertising: 7 };
    const state = game.play(game.initial(), p, () => .5);
    localStorage.setItem(saveKey, JSON.stringify(state));
    render(<App />);
    for (const v of game.varieties) expect(Number(field(`quantity-${v.id}`).value)).toBe(8);
    expect(Number(field('advertising').value)).toBe(7);
    expect(screen.getByText('1 day in the books')).toBeTruthy();
  });
  it.each(['{broken', JSON.stringify({ ...game.initial(), cash: 999999 }), JSON.stringify({ ...game.initial(), history: [{ day: '<img onerror=alert(1)>' }] })])('rejects tampered saves without rendering injected data: %s', raw => {
    localStorage.setItem(saveKey, raw); render(<App />);
    expect(document.getElementById('cash').textContent).toBe('$100.00');
    expect(screen.getByText(/saved game contains invalid/)).toBeTruthy();
    expect(document.querySelector('[onerror]')).toBe(null);
  });
  it('works when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled'); });
    render(<App />); start(); skip();
    expect(screen.getByText('1 day in the books')).toBeTruthy();
  });
  it('keeps active run when restart is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />); start(); skip();
    fireEvent.click(screen.getByRole('button', { name: 'New game ↗' }));
    expect(saved().history).toHaveLength(1);
  });
  it('handles no-sales days and closes when cash cannot cover overhead', () => {
    vi.useFakeTimers();
    let state = game.initial();
    for (let day = 0; day < 19; day++) state = game.play(state, { quantity: 0, price: 2, advertising: 0 }, () => .5);
    localStorage.setItem(saveKey, JSON.stringify(state));
    render(<App />); start();
    expect(saved().cash).toBe(0);
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText('Time to hang up the apron.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open shop/ }).disabled).toBe(true);
    start(); expect(saved().history).toHaveLength(20);
  });
  it('restores old single-variety saves and ends at day 30', () => {
    let state = game.initial();
    for (let day = 0; day < 30; day++) state = game.play(state, { quantity: 20, price: 2, advertising: 0 }, () => .5);
    state.history.forEach(r => { delete r.batches; });
    localStorage.setItem(saveKey, JSON.stringify(state)); render(<App />);
    expect(screen.getByText('30 days. One sweet journey.')).toBeTruthy();
    expect(field('quantity-oatmeal').value).toBe('0');
    expect(screen.getByRole('button', { name: /Open shop/ }).disabled).toBe(true);
    start(); expect(saved().history).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: /Start a fresh shop/ }));
    expect(saved().history).toHaveLength(0);
  });
});
