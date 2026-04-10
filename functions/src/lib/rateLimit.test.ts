import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, _resetRateLimiter } from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimiter();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', () => {
    const res = checkRateLimit('user-1', { max: 5, windowMs: 60_000 });
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
    expect(res.retryAfterMs).toBe(0);
  });

  it('decrements remaining on each allowed request', () => {
    const opts = { max: 3, windowMs: 60_000 };
    expect(checkRateLimit('user-2', opts).remaining).toBe(2);
    expect(checkRateLimit('user-2', opts).remaining).toBe(1);
    expect(checkRateLimit('user-2', opts).remaining).toBe(0);
  });

  it('denies when limit exceeded within window', () => {
    const opts = { max: 2, windowMs: 60_000 };
    checkRateLimit('user-3', opts); // allowed
    checkRateLimit('user-3', opts); // allowed
    const denied = checkRateLimit('user-3', opts);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('keeps denying subsequent requests in the same window', () => {
    const opts = { max: 1, windowMs: 60_000 };
    checkRateLimit('user-4', opts);
    const d1 = checkRateLimit('user-4', opts);
    const d2 = checkRateLimit('user-4', opts);
    expect(d1.allowed).toBe(false);
    expect(d2.allowed).toBe(false);
  });

  it('resets after the window expires', () => {
    const opts = { max: 1, windowMs: 60_000 };
    checkRateLimit('user-5', opts); // allowed
    expect(checkRateLimit('user-5', opts).allowed).toBe(false); // denied

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const res = checkRateLimit('user-5', opts);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(0); // max=1 → 1 used, 0 left
  });

  it('isolates counters per key', () => {
    const opts = { max: 2, windowMs: 60_000 };
    checkRateLimit('user-A', opts);
    checkRateLimit('user-A', opts);
    expect(checkRateLimit('user-A', opts).allowed).toBe(false);

    // user-B should still be fresh
    expect(checkRateLimit('user-B', opts).allowed).toBe(true);
    expect(checkRateLimit('user-B', opts).allowed).toBe(true);
  });

  it('retryAfterMs decreases as time passes within a blocked window', () => {
    const opts = { max: 1, windowMs: 60_000 };
    checkRateLimit('user-6', opts);
    const first = checkRateLimit('user-6', opts);

    vi.advanceTimersByTime(30_000);
    const later = checkRateLimit('user-6', opts);

    expect(later.allowed).toBe(false);
    expect(later.retryAfterMs).toBeLessThan(first.retryAfterMs);
    expect(later.retryAfterMs).toBeGreaterThan(0);
  });
});
