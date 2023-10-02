import { renderHooks, sleep } from '../../shared/test-utils';

import { useRequest } from '../useRequest';

let count = 0;

const getUsername = (): Promise<number> => {
  return new Promise(resolve => {
    setTimeout(() => {
      count = count + 1;
      resolve(count);
    }, 100);
  });
};

describe('useRequest/Debounce', () => {
  it('should Debounce work', async () => {
    const [hook] = renderHooks(() =>
      useRequest(() => getUsername(), {
        debounceWait: 100,
        manual: true,
      }),
    );
    hook.run();
    expect(hook.data.value).toBeUndefined();
    await sleep(100);
    expect(hook.data.value).toBeUndefined();
    await sleep(100);
    expect(hook.data.value).toBe(count);
    const _count = count;
    hook.run();
    hook.run();
    hook.run();
    hook.run();
    hook.run();
    hook.run();
    await sleep(100);
    await sleep(100);
    expect(hook.data.value).toBe(_count + 1);
  });
});
