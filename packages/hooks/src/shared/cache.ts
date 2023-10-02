type Timer = ReturnType<typeof setTimeout>;
export type CachedKey = string | number;

export interface CachedData<TData = any, TParams = any> {
  data: TData;
  params: TParams;
  time: number;
}
interface RecordData extends CachedData {
  timer: Timer | undefined;
}

const cache = new Map<CachedKey, RecordData>();

export const setCache = (key: CachedKey, cacheTime: number, cachedData: CachedData) => {
  const currentCache = cache.get(key);
  if (currentCache?.timer) {
    clearTimeout(currentCache.timer);
  }

  let timer: Timer | undefined = undefined;

  if (cacheTime > -1) {
    timer = setTimeout(() => {
      cache.delete(key);
    }, cacheTime);
  }

  cache.set(key, {
    ...cachedData,
    timer,
  });
};

export const getCache = (key: CachedKey) => {
  return cache.get(key);
};

export const getCacheAll = () => {
  return Object.fromEntries(cache.entries());
};

export const clearCache = (key?: string | string[]) => {
  if (key) {
    const cacheKeys = Array.isArray(key) ? key : [key];
    cacheKeys.forEach(cacheKey => cache.delete(cacheKey));
  } else {
    cache.clear();
  }
};

const cachePromise = new Map<CachedKey, Promise<any>>();

export const getCachePromise = (cacheKey: CachedKey) => {
  return cachePromise.get(cacheKey);
};

export const setCachePromise = (cacheKey: CachedKey, promise: Promise<any>) => {
  // 应该缓存同样的请求
  cachePromise.set(cacheKey, promise);

  // 兼容-不使用promise.finally
  promise
    .then(res => {
      cachePromise.delete(cacheKey);
      return res;
    })
    .catch(err => {
      cachePromise.delete(cacheKey);
      throw err;
    });
};

type Listener = (data: any) => void;
const listeners: Record<string, Listener[]> = {};
const otherListeners: Listener[] = [];

const trigger = (key: string, data: any) => {
  if (listeners[key]) {
    listeners[key].forEach(item => item(data));
    otherListeners.forEach(item =>
      item({
        type: key,
        data,
      }),
    );
  }
};

const subscribe = (key: string, listener: Listener) => {
  if (!listeners[key]) {
    listeners[key] = [];
  }
  listeners[key].push(listener);

  return function unsubscribe() {
    const index = listeners[key].indexOf(listener);
    listeners[key].splice(index, 1);
  };
};

const otherSubscribe = (listener: Listener) => {
  otherListeners.push(listener);
};

export { trigger, subscribe, otherSubscribe };
