import { ref, computed, watchEffect, unref } from 'vue';
import type { DebouncedFunc, DebounceSettings } from 'lodash';
import { debounce, isUndefined } from 'lodash';
import type { UseRequestPlugin } from '../types';

const useDebouncePlugin: UseRequestPlugin<unknown, unknown[]> = (
  fetchInstance,
  { debounceMaxWait, debounceLeading, debounceTrailing, debounceWait },
) => {
  if (!unref(debounceWait)) {
    return {};
  }

  const debounceRef = ref<DebouncedFunc<any>>();
  const options = computed(() => {
    const settings: DebounceSettings = {};
    const leading = unref(debounceLeading);
    const trailing = unref(debounceTrailing);
    const maxWait = unref(debounceMaxWait);

    if (!isUndefined(leading)) {
      settings.leading = leading;
    }

    if (!isUndefined(trailing)) {
      settings.trailing = trailing;
    }

    if (!isUndefined(maxWait)) {
      settings.maxWait = maxWait;
    }

    return settings;
  });

  watchEffect(cleanup => {
    const wait = unref(debounceWait);
    const originRunAsync = fetchInstance.runAsync.bind(fetchInstance);
    debounceRef.value = debounce(
      (cb: () => void) => {
        cb();
      },
      wait,
      options.value,
    );
    fetchInstance.runAsync = (...args) => {
      return new Promise((resolve, reject) => {
        debounceRef.value?.(() => {
          originRunAsync(...args)
            .then(resolve)
            .catch(reject);
        });
      });
    };
    cleanup(() => {
      debounceRef.value?.cancel();
      fetchInstance.runAsync = originRunAsync;
    });
  });

  return {
    name: 'debouncePlugin',
    onCancel: () => {
      debounceRef.value?.cancel();
    },
  };
};

export default useDebouncePlugin;
