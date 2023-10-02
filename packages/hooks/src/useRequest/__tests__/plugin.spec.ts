import { renderHooks, sleep } from '../../shared/test-utils';

import { UseRequestPlugin } from '../types';
import { useRequest } from '../useRequest';

const getUsername = (): Promise<{ name: string; age: number }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        name: 'sunshine',
        age: 18,
      });
    }, 1000);
  });
};

const useFormatterPlugin: UseRequestPlugin<
  {
    name: string;
    age: number;
  },
  [],
  {
    formatter?: (params?: { name: string; age: number }) => any;
  }
> = (fetchInstance, { formatter }) => {
  return {
    onSuccess: () => {
      fetchInstance.setFetchState(formatter?.(fetchInstance.getState().data), 'data');
    },
  };
};

describe('useRequest/Plugin', () => {
  const [{ data, loading }] = renderHooks(() =>
    useRequest(
      () => getUsername(),
      {
        formatter: (data: any) => {
          return {
            name: `${data.name} - plugins update`,
            age: 20,
          };
        },
      },
      [useFormatterPlugin],
    ),
  );

  it('useRequest should work', () => {
    expect(loading.value).toBeTruthy();
    expect(data?.value).toBeUndefined();
  });

  it('useRequest custom plugin should work', async () => {
    await sleep(1000);
    expect(data.value?.name).toBe('sunshine - plugins update');
    expect(data.value?.age).toBe(20);
  });
});
