import { renderHooks, sleep } from '../../shared/test-utils';
import { useRequest } from '../useRequest';

const getUsername = (params: { desc: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (params?.desc && params.desc === 'nice2') reject('error');
      resolve(`sunshine ${params?.desc}`);
    }, 200);
  });
};

describe('useRequest/Basic', () => {
  it('should auto work', async () => {
    const [hook] = renderHooks(() =>
      useRequest(getUsername, {
        defaultParams: [
          {
            desc: 'nice',
          },
        ],
      }),
    );
    await sleep(200);
    expect(hook.data.value).toBe('sunshine nice');
  });

  it('should manual run', async () => {
    const [hook] = renderHooks(() =>
      useRequest(getUsername, {
        manual: true,
        defaultParams: [
          {
            desc: 'nice',
          },
        ],
      }),
    );

    await sleep(200);
    expect(hook.data.value).toBeUndefined();
    hook.run({ desc: 'name' });
    await sleep(200);
    expect(hook.data.value).toBe('sunshine name');
  });

  it('should params work', async () => {
    const [hook] = renderHooks(() =>
      useRequest(getUsername, {
        defaultParams: [
          {
            desc: 'nice',
          },
        ],
      }),
    );

    await sleep(200);
    expect(hook.params.value?.[0]?.desc).toBe('nice');
    hook.run({ desc: 'name' });
    await sleep(200);
    expect(hook.params.value?.[0]?.desc).toBe('name');
  });

  it('should mutate and rollbackError', async () => {
    const [hook] = renderHooks(() =>
      useRequest(getUsername, {
        rollbackError: true,
      }),
    );

    hook.mutate('sunshine name');
    expect(hook.data.value).toBe('sunshine name');
    await sleep(200);
    expect(hook.data.value).toBe('sunshine undefined');
    hook.run({ desc: 'name' });
    await sleep(200);
    expect(hook.data.value).toBe('sunshine name');
    hook.run({ desc: 'nice2' });
    await sleep(200);
    expect(hook.data.value).toBe('sunshine name');
  });
});
