import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { setPositionFixed } from '../../src/drawer/position-fixed';

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.removeAttribute('style');
});

it('keeps the body fixed until every holder has released it', () => {
  const releaseA = setPositionFixed();
  const releaseB = setPositionFixed();
  expect(document.body.style.position).toBe('fixed');

  releaseA();
  releaseA(); // releasing twice counts once
  expect(document.body.style.position).toBe('fixed');

  releaseB();
  expect(document.body.style.position).toBe('');
});
