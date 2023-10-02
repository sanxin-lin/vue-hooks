import { ref, computed, watchEffect, unref } from 'vue';
import type { ThrottleSettings, DebouncedFunc } from 'lodash';
import { throttle, isUndefined } from 'lodash';
import type { UseRequestPlugin } from '../types';

const useThrottlePlugin: UseRequestPlugin<unknown, unknown[]> = (
  fetchInstance,
  { throttleLeading, throttleTrailing, throttleWait },
) => {
  if (!unref(throttleWait)) {
    return {};
  }

  const throttleRef = ref<DebouncedFunc<any>>();
  const options = computed(() => {
    const setting: ThrottleSettings = {};
    const leading = unref(throttleLeading);
    const trailing = unref(throttleTrailing);

    if (!isUndefined(leading)) {
      setting.leading = leading;
    }

    if (!isUndefined(trailing)) {
      setting.trailing = trailing;
    }

    return setting;
  });

  watchEffect(cleanup => {
    const originRunAsync = fetchInstance.runAsync.bind(fetchInstance);
    throttleRef.value = throttle(
      (cb: () => void) => {
        cb();
      },
      unref(throttleWait),
      options.value,
    );
    fetchInstance.runAsync = (...args) => {
      return new Promise((resolve, reject) => {
        throttleRef.value?.(() => {
          originRunAsync(...args)
            .then(resolve)
            .catch(reject);
        });
      });
    };
    cleanup(() => {
      fetchInstance.runAsync = originRunAsync;
      throttleRef.value?.cancel();
    });
  });

  return {
    name: 'throttlePlugin',
    onCancel: () => {
      throttleRef.value?.cancel();
    },
  };
};

export default useThrottlePlugin;
