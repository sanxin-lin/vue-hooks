import { canUseDom } from './dom';

export const limit = (fn: any, timespan: number) => {
  let pending = false;
  return (...args: any[]) => {
    if (pending) return;
    pending = true;
    fn(...args);
    setTimeout(() => {
      pending = false;
    }, timespan);
  };
};

export const isOnline = (): boolean => {
  if (canUseDom() && typeof navigator.onLine !== 'undefined') {
    return navigator.onLine;
  }
  return true;
};
