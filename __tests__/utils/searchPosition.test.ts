import { saveSearchPosition, restoreSearchPosition } from '@/app/utils/searchPosition';

beforeEach(() => {
  sessionStorage.clear();
  window.scrollTo = jest.fn();
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 3000,
  });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 800 });
});

it('restores only the matching search after results render, once', () => {
  saveSearchPosition('/?page=2');
  restoreSearchPosition('/?page=1');
  expect(window.scrollTo).not.toHaveBeenCalled();
  restoreSearchPosition('/?page=2');
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 800, behavior: 'instant' });
  restoreSearchPosition('/?page=2');
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
});

it('ignores corrupt, stale, or unbounded offsets', () => {
  for (const record of [
    'invalid',
    JSON.stringify({ href: '/', y: 10, at: 0 }),
    JSON.stringify({ href: '/', y: -1, at: Date.now() }),
  ]) {
    sessionStorage.setItem('wts.searchPosition', record);
    restoreSearchPosition('/');
  }
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it('continues when storage is unavailable', () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(() => saveSearchPosition('/')).not.toThrow();
  spy.mockRestore();
});
